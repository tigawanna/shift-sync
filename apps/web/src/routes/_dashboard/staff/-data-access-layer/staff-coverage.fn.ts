import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { coverageRequest } from "@/lib/drizzle/schema/coverage-schema";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import {
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import { skill as skillTable, userSkill } from "@/lib/drizzle/schema/skills-schema";
import { COVERAGE_KIND, COVERAGE_STATUS } from "@/lib/schedule/coverage";
import {
  assertAssignedToShift,
  assertPendingCapacity,
  assertQualifiedForShift,
  getDbAndExpire,
  loadPublishedShift,
} from "@/lib/schedule/coverage.server";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";

const shiftIdSchema = z.object({ shiftId: z.string().min(1) });
const requestIdSchema = z.object({ requestId: z.string().min(1) });

export const requestSwapInputSchema = z.object({
  shiftId: z.string().min(1),
  toUserId: z.string().min(1),
});

export const listMyCoverage = createServerFn({ method: "GET" }).handler(async () => {
  const { session } = await requireSessionRoles([ROLE.staff]);
  const db = await getDbAndExpire();
  const userId = session.user.id;

  const rows = await db
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
    .where(and(eq(coverageRequest.fromUserId, userId)))
    .orderBy(desc(coverageRequest.createdAt));

  const incoming = await db
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
        eq(coverageRequest.toUserId, userId),
        eq(coverageRequest.kind, COVERAGE_KIND.swap),
        eq(coverageRequest.status, COVERAGE_STATUS.pending_peer),
      ),
    );

  const openDrops = await db
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
    .innerJoin(
      userLocation,
      and(eq(userLocation.locationId, shiftTable.locationId), eq(userLocation.userId, userId)),
    )
    .innerJoin(
      userSkill,
      and(eq(userSkill.skillId, shiftTable.skillId), eq(userSkill.userId, userId)),
    )
    .where(
      and(
        eq(coverageRequest.kind, COVERAGE_KIND.drop),
        eq(coverageRequest.status, COVERAGE_STATUS.open),
        ne(coverageRequest.fromUserId, userId),
      ),
    );

  return { mine: rows, incoming, openDrops };
});

export const listSwapCandidates = createServerFn({ method: "GET" })
  .validator(shiftIdSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    const db = await getDbAndExpire();
    await assertAssignedToShift(db, data.shiftId, session.user.id);
    const published = await loadPublishedShift(db, data.shiftId);

    const assigned = await db
      .select({ userId: shiftAssignmentTable.userId })
      .from(shiftAssignmentTable)
      .where(eq(shiftAssignmentTable.shiftId, data.shiftId));
    const assignedIds = new Set(assigned.map((row) => row.userId));

    const candidates = await db
      .select({
        id: userTable.id,
        name: userTable.name,
      })
      .from(userTable)
      .innerJoin(
        userLocation,
        and(
          eq(userLocation.userId, userTable.id),
          eq(userLocation.locationId, published.shift.locationId),
        ),
      )
      .innerJoin(
        userSkill,
        and(eq(userSkill.userId, userTable.id), eq(userSkill.skillId, published.shift.skillId)),
      )
      .where(and(eq(userTable.role, ROLE.staff), ne(userTable.id, session.user.id)));

    return {
      items: candidates.filter((person) => !assignedIds.has(person.id)),
    };
  });

export const requestSwap = createServerFn({ method: "POST" })
  .validator(requestSwapInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    if (data.toUserId === session.user.id) {
      throw new Error("Pick someone else to swap with.");
    }
    const db = await getDbAndExpire();
    await loadPublishedShift(db, data.shiftId);
    await assertAssignedToShift(db, data.shiftId, session.user.id);
    await assertQualifiedForShift(db, data.toUserId, data.shiftId);
    await assertPendingCapacity(db, session.user.id);

    await db.insert(coverageRequest).values({
      id: crypto.randomUUID(),
      kind: COVERAGE_KIND.swap,
      status: COVERAGE_STATUS.pending_peer,
      shiftId: data.shiftId,
      fromUserId: session.user.id,
      toUserId: data.toUserId,
    });

    return { ok: true as const };
  });

export const requestDrop = createServerFn({ method: "POST" })
  .validator(shiftIdSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    const db = await getDbAndExpire();
    await loadPublishedShift(db, data.shiftId);
    await assertAssignedToShift(db, data.shiftId, session.user.id);
    await assertPendingCapacity(db, session.user.id);

    await db.insert(coverageRequest).values({
      id: crypto.randomUUID(),
      kind: COVERAGE_KIND.drop,
      status: COVERAGE_STATUS.open,
      shiftId: data.shiftId,
      fromUserId: session.user.id,
    });

    return { ok: true as const };
  });

export const pickupDrop = createServerFn({ method: "POST" })
  .validator(requestIdSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    const db = await getDbAndExpire();
    const [row] = await db
      .select()
      .from(coverageRequest)
      .where(eq(coverageRequest.id, data.requestId))
      .limit(1);

    if (!row || row.kind !== COVERAGE_KIND.drop || row.status !== COVERAGE_STATUS.open) {
      throw new Error("That drop is no longer open.");
    }
    if (row.fromUserId === session.user.id) {
      throw new Error("You already hold this shift.");
    }

    await assertQualifiedForShift(db, session.user.id, row.shiftId);
    await assertPendingCapacity(db, session.user.id);

    await db
      .update(coverageRequest)
      .set({
        toUserId: session.user.id,
        status: COVERAGE_STATUS.pending_manager,
      })
      .where(eq(coverageRequest.id, row.id));

    return { ok: true as const };
  });

export const acceptIncomingSwap = createServerFn({ method: "POST" })
  .validator(requestIdSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    const db = await getDbAndExpire();
    const [row] = await db
      .select()
      .from(coverageRequest)
      .where(eq(coverageRequest.id, data.requestId))
      .limit(1);

    if (!row || row.toUserId !== session.user.id || row.status !== COVERAGE_STATUS.pending_peer) {
      throw new Error("That swap is not waiting on you.");
    }

    await db
      .update(coverageRequest)
      .set({ status: COVERAGE_STATUS.pending_manager })
      .where(eq(coverageRequest.id, row.id));

    return { ok: true as const };
  });

export const declineIncomingSwap = createServerFn({ method: "POST" })
  .validator(requestIdSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    const db = await getDbAndExpire();
    const [row] = await db
      .select()
      .from(coverageRequest)
      .where(eq(coverageRequest.id, data.requestId))
      .limit(1);

    if (!row || row.toUserId !== session.user.id || row.status !== COVERAGE_STATUS.pending_peer) {
      throw new Error("That swap is not waiting on you.");
    }

    await db
      .update(coverageRequest)
      .set({
        status: COVERAGE_STATUS.rejected,
        resolvedAt: new Date(),
        resolvedByUserId: session.user.id,
      })
      .where(eq(coverageRequest.id, row.id));

    return { ok: true as const };
  });

export const withdrawCoverage = createServerFn({ method: "POST" })
  .validator(requestIdSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    const db = await getDbAndExpire();
    const [row] = await db
      .select()
      .from(coverageRequest)
      .where(eq(coverageRequest.id, data.requestId))
      .limit(1);

    if (!row || row.fromUserId !== session.user.id) {
      throw new Error("You can only withdraw your own request.");
    }
    if (
      row.status !== COVERAGE_STATUS.open &&
      row.status !== COVERAGE_STATUS.pending_peer &&
      row.status !== COVERAGE_STATUS.pending_manager
    ) {
      throw new Error("That request is no longer pending.");
    }

    await db
      .update(coverageRequest)
      .set({
        status: COVERAGE_STATUS.withdrawn,
        resolvedAt: new Date(),
        resolvedByUserId: session.user.id,
      })
      .where(eq(coverageRequest.id, row.id));

    return { ok: true as const };
  });
