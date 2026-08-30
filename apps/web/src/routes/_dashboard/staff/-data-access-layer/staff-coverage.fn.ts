import { SWAP_CANDIDATE_LIMIT } from "@/components/pagination/constants";
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
import { COVERAGE_KIND, COVERAGE_PENDING_LIMIT, COVERAGE_STATUS } from "@/lib/schedule/coverage";
import {
  assertAssignedToShift,
  assertPendingCapacity,
  assertQualifiedForShift,
  getDbAndExpire,
  loadPublishedShift,
} from "@/lib/schedule/coverage.server";
import { loadLocationManagerIds, notifyUsers } from "@/lib/schedule/notify.server";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, desc, eq, inArray, like, ne, notInArray, or } from "drizzle-orm";
import { z } from "zod";

const requestIdSchema = z.object({ requestId: z.string().min(1) });
const shiftIdsSchema = z.object({
  shiftIds: z.array(z.string().min(1)).min(1).max(COVERAGE_PENDING_LIMIT),
});

export const requestSwapInputSchema = z.object({
  shiftIds: z.array(z.string().min(1)).min(1).max(COVERAGE_PENDING_LIMIT),
  toUserId: z.string().min(1),
});

export const listSwapCandidatesInputSchema = z.object({
  shiftIds: z.array(z.string().min(1)).min(1).max(COVERAGE_PENDING_LIMIT),
  q: z.string().optional().default(""),
});

function uniqueShiftIds(ids: string[]) {
  return [...new Set(ids)];
}

function staffNameSearch(q: string) {
  const trimmed = q.trim();
  if (!trimmed) return undefined;
  const pattern = `%${trimmed}%`;
  return or(like(userTable.name, pattern), like(userTable.email, pattern));
}

async function loadMyPublishedShifts(
  db: Awaited<ReturnType<typeof getDbAndExpire>>,
  userId: string,
  shiftIds: string[],
) {
  const uniqueIds = uniqueShiftIds(shiftIds);
  const published = await Promise.all(
    uniqueIds.map(async (shiftId) => {
      await assertAssignedToShift(db, shiftId, userId);
      return loadPublishedShift(db, shiftId);
    }),
  );
  const lead = published[0];
  if (!lead) throw new Error("Pick at least one shift.");
  const sameRoster = published.every(
    (row) =>
      row.shift.locationId === lead.shift.locationId && row.shift.skillId === lead.shift.skillId,
  );
  if (!sameRoster) {
    throw new Error(
      "Those shifts are not the same location and skill. Swap or drop them separately.",
    );
  }
  return { uniqueIds, published, lead };
}

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
  .validator(listSwapCandidatesInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    const db = await getDbAndExpire();
    const { uniqueIds, lead } = await loadMyPublishedShifts(db, session.user.id, data.shiftIds);

    const assigned = await db
      .select({ userId: shiftAssignmentTable.userId })
      .from(shiftAssignmentTable)
      .where(inArray(shiftAssignmentTable.shiftId, uniqueIds));
    const assignedIds = [...new Set(assigned.map((row) => row.userId))];

    const candidateWhere = and(
      eq(userLocation.locationId, lead.shift.locationId),
      eq(userSkill.skillId, lead.shift.skillId),
      eq(userTable.role, ROLE.staff),
      ne(userTable.id, session.user.id),
      assignedIds.length > 0 ? notInArray(userTable.id, assignedIds) : undefined,
      staffNameSearch(data.q),
    );

    const [items, totalRow] = await Promise.all([
      db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
        })
        .from(userTable)
        .innerJoin(userLocation, eq(userLocation.userId, userTable.id))
        .innerJoin(userSkill, eq(userSkill.userId, userTable.id))
        .where(candidateWhere)
        .orderBy(asc(userTable.name))
        .limit(SWAP_CANDIDATE_LIMIT),
      db
        .select({ total: count() })
        .from(userTable)
        .innerJoin(userLocation, eq(userLocation.userId, userTable.id))
        .innerJoin(userSkill, eq(userSkill.userId, userTable.id))
        .where(candidateWhere),
    ]);

    return { items, total: totalRow[0]?.total ?? 0 };
  });

export const requestSwap = createServerFn({ method: "POST" })
  .validator(requestSwapInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    if (data.toUserId === session.user.id) {
      throw new Error("Pick someone else to swap with.");
    }
    const db = await getDbAndExpire();
    const { uniqueIds, lead } = await loadMyPublishedShifts(db, session.user.id, data.shiftIds);
    await assertQualifiedForShift(db, data.toUserId, uniqueIds[0] ?? lead.shift.id);
    await assertPendingCapacity(db, session.user.id, uniqueIds.length);

    await db.insert(coverageRequest).values(
      uniqueIds.map((shiftId) => ({
        id: crypto.randomUUID(),
        kind: COVERAGE_KIND.swap,
        status: COVERAGE_STATUS.pending_peer,
        shiftId,
        fromUserId: session.user.id,
        toUserId: data.toUserId,
      })),
    );
    await notifyUsers(db, [data.toUserId], {
      kind: "swap_incoming",
      title: uniqueIds.length > 1 ? "Swap requests" : "Swap request",
      body:
        uniqueIds.length > 1
          ? `Someone asked to swap ${uniqueIds.length} shifts with you.`
          : "Someone asked to swap a shift with you.",
    });

    return { ok: true as const };
  });

export const requestDrop = createServerFn({ method: "POST" })
  .validator(shiftIdsSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    const db = await getDbAndExpire();
    const { uniqueIds, lead } = await loadMyPublishedShifts(db, session.user.id, data.shiftIds);
    await assertPendingCapacity(db, session.user.id, uniqueIds.length);

    await db.insert(coverageRequest).values(
      uniqueIds.map((shiftId) => ({
        id: crypto.randomUUID(),
        kind: COVERAGE_KIND.drop,
        status: COVERAGE_STATUS.open,
        shiftId,
        fromUserId: session.user.id,
      })),
    );
    const managers = await loadLocationManagerIds(db, lead.location.id);
    await notifyUsers(db, managers, {
      kind: "coverage_pending",
      title: uniqueIds.length > 1 ? "Drop requests" : "Drop request",
      body:
        uniqueIds.length > 1
          ? `${lead.location.name}: a staff member offered ${uniqueIds.length} shifts as drops.`
          : `${lead.location.name}: a staff member offered a shift as a drop.`,
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

    const published = await loadPublishedShift(db, row.shiftId);
    const managers = await loadLocationManagerIds(db, published.location.id);
    await notifyUsers(db, [...managers, row.fromUserId], {
      kind: "coverage_pending",
      title: "Pickup waiting on a manager",
      body: `${published.location.name}: a drop was picked up and needs approval.`,
    });

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

    const published = await loadPublishedShift(db, row.shiftId);
    const managers = await loadLocationManagerIds(db, published.location.id);
    await notifyUsers(db, [...managers, row.fromUserId], {
      kind: "coverage_pending",
      title: "Swap waiting on a manager",
      body: `${published.location.name}: a swap was accepted and needs approval.`,
    });

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
