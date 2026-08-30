import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { coverageRequest } from "@/lib/drizzle/schema/coverage-schema";
import { location as locationTable } from "@/lib/drizzle/schema/locations-schema";
import { shift as shiftTable } from "@/lib/drizzle/schema/schedule-schema";
import { skill as skillTable } from "@/lib/drizzle/schema/skills-schema";
import { COVERAGE_STATUS } from "@/lib/schedule/coverage";
import { notifyUsers } from "@/lib/schedule/notify.server";
import { recordScheduleAudit, snapshotShift } from "@/lib/schedule/audit.server";
import { applyApprovedCoverage, getDbAndExpire } from "@/lib/schedule/coverage.server";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { loadMyManagerLocations } from "./manager-locations.server";

const requestIdSchema = z.object({ requestId: z.string().min(1) });

export const listManagerCoverage = createServerFn({ method: "GET" }).handler(async () => {
  const { session } = await requireSessionRoles([ROLE.manager]);
  const managed = await loadMyManagerLocations(session.user.id);
  const locationIds = managed.map((location) => location.id);
  if (locationIds.length === 0) return { items: [] };

  const db = await getDbAndExpire();
  const items = await db
    .select({
      request: coverageRequest,
      shift: shiftTable,
      locationName: locationTable.name,
      skillName: skillTable.name,
      fromName: userTable.name,
    })
    .from(coverageRequest)
    .innerJoin(shiftTable, eq(shiftTable.id, coverageRequest.shiftId))
    .innerJoin(locationTable, eq(locationTable.id, shiftTable.locationId))
    .innerJoin(skillTable, eq(skillTable.id, shiftTable.skillId))
    .innerJoin(userTable, eq(userTable.id, coverageRequest.fromUserId))
    .where(
      and(
        inArray(shiftTable.locationId, locationIds),
        eq(coverageRequest.status, COVERAGE_STATUS.pending_manager),
      ),
    )
    .orderBy(desc(coverageRequest.updatedAt));

  return { items };
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

    const before = await snapshotShift(db, row.request.shiftId);
    await db.transaction(async (tx) => {
      await applyApprovedCoverage(tx, row.request);
      await tx
        .update(coverageRequest)
        .set({
          status: COVERAGE_STATUS.approved,
          resolvedAt: new Date(),
          resolvedByUserId: session.user.id,
        })
        .where(eq(coverageRequest.id, row.request.id));
    });
    await recordScheduleAudit(db, {
      locationId: row.locationId,
      shiftId: row.request.shiftId,
      actorUserId: session.user.id,
      action: "coverage_approve",
      before,
      after: await snapshotShift(db, row.request.shiftId),
    });

    await notifyUsers(db, [row.request.fromUserId, row.request.toUserId ?? ""], {
      kind: "coverage_approved",
      title: "Coverage approved",
      body: "A manager approved a swap or pickup. The assignment has moved.",
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

    await db
      .update(coverageRequest)
      .set({
        status: COVERAGE_STATUS.rejected,
        resolvedAt: new Date(),
        resolvedByUserId: session.user.id,
      })
      .where(eq(coverageRequest.id, row.request.id));

    await notifyUsers(db, [row.request.fromUserId, row.request.toUserId ?? ""], {
      kind: "coverage_rejected",
      title: "Coverage rejected",
      body: "A manager rejected a swap or pickup. The original assignment stays.",
    });

    return { ok: true as const };
  });
