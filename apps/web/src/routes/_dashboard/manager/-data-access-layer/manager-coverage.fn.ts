import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { coverageRequest } from "@/lib/drizzle/schema/coverage-schema";
import { location as locationTable } from "@/lib/drizzle/schema/locations-schema";
import { shift as shiftTable } from "@/lib/drizzle/schema/schedule-schema";
import { skill as skillTable } from "@/lib/drizzle/schema/skills-schema";
import { ACTIVE_COVERAGE_STATUSES, COVERAGE_STATUS } from "@/lib/schedule/coverage";
import { notifyUsers } from "@/lib/schedule/notify.server";
import { snapshotShift } from "@/lib/schedule/audit.server";
import { emitCoverageAudit } from "@/lib/schedule/coverage-audit.hooks";
import { applyApprovedCoverageOn, getDbAndExpire } from "@/lib/schedule/coverage.server";
import { createServerFn } from "@tanstack/react-start";
import { and, count, desc, eq, inArray, like, notInArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import { loadMyManagerLocations } from "./manager-locations.server";

const requestIdSchema = z.object({ requestId: z.string().min(1) });
const coverageToUser = alias(userTable, "coverage_to_user");
const coverageResolvedBy = alias(userTable, "coverage_resolved_by");

export const listManagerCoverageInputSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
  status: z.enum(["all", "pending", "resolved"]).optional().default("pending"),
});

export type ListManagerCoverageInput = z.input<typeof listManagerCoverageInputSchema>;

function coverageSearch(sq: string) {
  const trimmed = sq.trim();
  if (!trimmed) return undefined;
  const pattern = `%${trimmed}%`;
  return or(
    like(locationTable.name, pattern),
    like(skillTable.name, pattern),
    like(userTable.name, pattern),
    like(coverageToUser.name, pattern),
    like(coverageRequest.kind, pattern),
    like(coverageRequest.status, pattern),
  );
}

export const listManagerCoverage = createServerFn({ method: "GET" })
  .validator(listManagerCoverageInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const managed = await loadMyManagerLocations(session.user.id);
    const locationIds = managed.map((location) => location.id);
    const empty = {
      items: [],
      total: 0,
      page: data.page,
      perPage: data.perPage,
      totalPages: 1,
      pendingCount: 0,
    };
    if (locationIds.length === 0) return empty;

    const db = await getDbAndExpire();
    const page = data.page;
    const perPage = data.perPage;
    const statusWhere =
      data.status === "pending"
        ? eq(coverageRequest.status, COVERAGE_STATUS.pending_manager)
        : data.status === "resolved"
          ? notInArray(coverageRequest.status, [...ACTIVE_COVERAGE_STATUSES])
          : undefined;
    const where = and(
      inArray(shiftTable.locationId, locationIds),
      statusWhere,
      coverageSearch(data.sq),
    );
    const pendingWhere = and(
      inArray(shiftTable.locationId, locationIds),
      eq(coverageRequest.status, COVERAGE_STATUS.pending_manager),
    );

    const [items, totalRow, pendingRow] = await Promise.all([
      db
        .select({
          request: coverageRequest,
          shift: shiftTable,
          locationName: locationTable.name,
          locationTimezone: locationTable.timezone,
          skillName: skillTable.name,
          fromName: userTable.name,
          toName: coverageToUser.name,
          resolvedByName: coverageResolvedBy.name,
        })
        .from(coverageRequest)
        .innerJoin(shiftTable, eq(shiftTable.id, coverageRequest.shiftId))
        .innerJoin(locationTable, eq(locationTable.id, shiftTable.locationId))
        .innerJoin(skillTable, eq(skillTable.id, shiftTable.skillId))
        .innerJoin(userTable, eq(userTable.id, coverageRequest.fromUserId))
        .leftJoin(coverageToUser, eq(coverageToUser.id, coverageRequest.toUserId))
        .leftJoin(coverageResolvedBy, eq(coverageResolvedBy.id, coverageRequest.resolvedByUserId))
        .where(where)
        .orderBy(desc(coverageRequest.updatedAt))
        .limit(perPage)
        .offset((page - 1) * perPage),
      db
        .select({ total: count() })
        .from(coverageRequest)
        .innerJoin(shiftTable, eq(shiftTable.id, coverageRequest.shiftId))
        .innerJoin(locationTable, eq(locationTable.id, shiftTable.locationId))
        .innerJoin(skillTable, eq(skillTable.id, shiftTable.skillId))
        .innerJoin(userTable, eq(userTable.id, coverageRequest.fromUserId))
        .leftJoin(coverageToUser, eq(coverageToUser.id, coverageRequest.toUserId))
        .where(where),
      db
        .select({ total: count() })
        .from(coverageRequest)
        .innerJoin(shiftTable, eq(shiftTable.id, coverageRequest.shiftId))
        .where(pendingWhere),
    ]);

    const total = totalRow[0]?.total ?? 0;

    return {
      items,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      pendingCount: pendingRow[0]?.total ?? 0,
    };
  });

export const approveCoverage = createServerFn({ method: "POST" })
  .validator(requestIdSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const managed = await loadMyManagerLocations(session.user.id);
    const locationIds = new Set(managed.map((location) => location.id));
    const db = await getDbAndExpire();

    const [row] = await db
      .select({
        request: coverageRequest,
        locationId: shiftTable.locationId,
      })
      .from(coverageRequest)
      .innerJoin(shiftTable, eq(shiftTable.id, coverageRequest.shiftId))
      .where(eq(coverageRequest.id, data.requestId))
      .limit(1);

    if (!row || !locationIds.has(row.locationId)) {
      throw new Error("That request is not in a location you manage.");
    }
    if (row.request.status !== COVERAGE_STATUS.pending_manager) {
      throw new Error("That request is not waiting on a manager.");
    }

    await db.transaction(async (tx) => {
      const before = await snapshotShift(tx, row.request.shiftId);
      // Claim the request first: a second approver finds nothing to update.
      const resolved = await tx
        .update(coverageRequest)
        .set({
          status: COVERAGE_STATUS.approved,
          resolvedAt: new Date(),
          resolvedByUserId: session.user.id,
        })
        .where(
          and(
            eq(coverageRequest.id, row.request.id),
            eq(coverageRequest.status, COVERAGE_STATUS.pending_manager),
          ),
        )
        .returning({ id: coverageRequest.id });

      if (resolved.length === 0) {
        throw new Error("That request was already resolved.");
      }

      await applyApprovedCoverageOn(tx, row.request);
      await emitCoverageAudit({
        db: tx,
        locationId: row.locationId,
        shiftId: row.request.shiftId,
        actorUserId: session.user.id,
        action: "coverage_approve",
        before,
        after: await snapshotShift(tx, row.request.shiftId),
      });
      await notifyUsers(tx, [row.request.fromUserId, row.request.toUserId ?? ""], {
        kind: "coverage_approved",
        title: "Coverage approved",
        body: "A manager approved a swap or pickup. The assignment has moved.",
      });
    });

    return { ok: true as const };
  });

export const rejectCoverage = createServerFn({ method: "POST" })
  .validator(requestIdSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const managed = await loadMyManagerLocations(session.user.id);
    const locationIds = new Set(managed.map((location) => location.id));
    const db = await getDbAndExpire();

    const [row] = await db
      .select({
        request: coverageRequest,
        locationId: shiftTable.locationId,
      })
      .from(coverageRequest)
      .innerJoin(shiftTable, eq(shiftTable.id, coverageRequest.shiftId))
      .where(eq(coverageRequest.id, data.requestId))
      .limit(1);

    if (!row || !locationIds.has(row.locationId)) {
      throw new Error("That request is not in a location you manage.");
    }
    if (row.request.status !== COVERAGE_STATUS.pending_manager) {
      throw new Error("That request is not waiting on a manager.");
    }

    await db.transaction(async (tx) => {
      const resolved = await tx
        .update(coverageRequest)
        .set({
          status: COVERAGE_STATUS.rejected,
          resolvedAt: new Date(),
          resolvedByUserId: session.user.id,
        })
        .where(
          and(
            eq(coverageRequest.id, row.request.id),
            eq(coverageRequest.status, COVERAGE_STATUS.pending_manager),
          ),
        )
        .returning({ id: coverageRequest.id });

      if (resolved.length === 0) {
        throw new Error("That request was already resolved.");
      }

      await notifyUsers(tx, [row.request.fromUserId, row.request.toUserId ?? ""], {
        kind: "coverage_rejected",
        title: "Coverage rejected",
        body: "A manager rejected a swap or pickup. The original assignment stays.",
      });
      await emitCoverageAudit({
        db: tx,
        locationId: row.locationId,
        shiftId: row.request.shiftId,
        actorUserId: session.user.id,
        action: "coverage_reject",
        after: { requestId: row.request.id, status: COVERAGE_STATUS.rejected },
      });
    });

    return { ok: true as const };
  });
