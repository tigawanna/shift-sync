import { getDb, type AppDatabase, type DbSession } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { coverageRequest } from "@/lib/drizzle/schema/coverage-schema";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import {
  scheduleWeek as scheduleWeekTable,
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import { userSkill } from "@/lib/drizzle/schema/skills-schema";
import {
  ACTIVE_COVERAGE_STATUSES,
  COVERAGE_PENDING_LIMIT,
  COVERAGE_STATUS,
  DROP_EXPIRE_HOURS,
} from "@/lib/schedule/coverage";
import { auditCoverageChange } from "@/lib/schedule/coverage-audit.hooks";
import { notifyUsers } from "@/lib/schedule/notify.server";
import { mondayOfWeekContaining } from "@/lib/time/zoned";
import { and, count, eq, inArray } from "drizzle-orm";

/** Close unclaimed drop offers once the shift is within DROP_EXPIRE_HOURS (24h). Runs on coverage reads/writes via getDbAndExpire — there is no scheduler. Example: now 3pm Monday, a Tuesday 2pm shift is expired (starts ≤ now+24h); a Tuesday 4pm shift stays open. */
export async function expireOpenDrops(db: AppDatabase, now = new Date()) {
  const cutoff = now.getTime() + DROP_EXPIRE_HOURS * 3_600_000;
  const openDrops = await db
    .select({
      id: coverageRequest.id,
      fromUserId: coverageRequest.fromUserId,
      shiftId: coverageRequest.shiftId,
      locationId: shiftTable.locationId,
      startsAt: shiftTable.startsAt,
    })
    .from(coverageRequest)
    .innerJoin(shiftTable, eq(shiftTable.id, coverageRequest.shiftId))
    .where(and(eq(coverageRequest.kind, "drop"), eq(coverageRequest.status, COVERAGE_STATUS.open)));

  const expired = openDrops.filter((row) => row.startsAt.getTime() <= cutoff);

  if (expired.length === 0) return 0;

  await db.transaction(async (tx) => {
    await tx
      .update(coverageRequest)
      .set({
        status: COVERAGE_STATUS.expired,
        resolvedAt: now,
      })
      .where(
        inArray(
          coverageRequest.id,
          expired.map((row) => row.id),
        ),
      );

    for (const row of expired) {
      await auditCoverageChange(tx, {
        locationId: row.locationId,
        shiftId: row.shiftId,
        actorUserId: row.fromUserId,
        action: "coverage_expire",
        after: { requestId: row.id, status: COVERAGE_STATUS.expired },
      });
    }
  });

  return expired.length;
}

export async function cancelActiveCoverageForShift(
  db: DbSession,
  shiftId: string,
  resolvedByUserId: string,
) {
  await db.transaction(async (tx) => {
    const pending = await tx
      .select({
        id: coverageRequest.id,
        fromUserId: coverageRequest.fromUserId,
        toUserId: coverageRequest.toUserId,
        locationId: shiftTable.locationId,
      })
      .from(coverageRequest)
      .innerJoin(shiftTable, eq(shiftTable.id, coverageRequest.shiftId))
      .where(
        and(
          eq(coverageRequest.shiftId, shiftId),
          inArray(coverageRequest.status, [...ACTIVE_COVERAGE_STATUSES]),
        ),
      );

    await tx
      .update(coverageRequest)
      .set({
        status: COVERAGE_STATUS.cancelled,
        resolvedAt: new Date(),
        resolvedByUserId,
      })
      .where(
        and(
          eq(coverageRequest.shiftId, shiftId),
          inArray(coverageRequest.status, [...ACTIVE_COVERAGE_STATUSES]),
        ),
      );

    const userIds = pending.flatMap((row) => [row.fromUserId, row.toUserId ?? ""]);
    await notifyUsers(tx, userIds, {
      kind: "coverage_cancelled",
      title: "Coverage request cancelled",
      body: "A pending swap or drop was cancelled because that shift was edited.",
    });
    for (const row of pending) {
      await auditCoverageChange(tx, {
        locationId: row.locationId,
        shiftId,
        actorUserId: resolvedByUserId,
        action: "coverage_cancel",
        after: { requestId: row.id, status: COVERAGE_STATUS.cancelled },
      });
    }
  });
}

export async function countActiveCoverageForUser(db: DbSession, userId: string) {
  const [row] = await db
    .select({ total: count() })
    .from(coverageRequest)
    .where(
      and(
        eq(coverageRequest.fromUserId, userId),
        inArray(coverageRequest.status, [...ACTIVE_COVERAGE_STATUSES]),
      ),
    );
  return row?.total ?? 0;
}

export async function assertPendingCapacity(db: DbSession, userId: string, additional = 1) {
  const total = await countActiveCoverageForUser(db, userId);
  if (total + additional > COVERAGE_PENDING_LIMIT) {
    throw new Error(
      `You can have at most ${COVERAGE_PENDING_LIMIT} pending swap or drop requests.`,
    );
  }
}

export async function assertQualifiedForShift(db: DbSession, userId: string, shiftId: string) {
  const [row] = await db
    .select({
      userId: userTable.id,
      skillId: shiftTable.skillId,
      locationId: shiftTable.locationId,
    })
    .from(shiftTable)
    .innerJoin(
      userLocation,
      and(eq(userLocation.locationId, shiftTable.locationId), eq(userLocation.userId, userId)),
    )
    .innerJoin(
      userSkill,
      and(eq(userSkill.skillId, shiftTable.skillId), eq(userSkill.userId, userId)),
    )
    .innerJoin(userTable, eq(userTable.id, userId))
    .where(eq(shiftTable.id, shiftId))
    .limit(1);

  if (!row) {
    throw new Error("They are not qualified for this skill and location.");
  }
}

export async function loadPublishedShift(db: DbSession, shiftId: string) {
  const [row] = await db
    .select({
      shift: shiftTable,
      location: locationTable,
    })
    .from(shiftTable)
    .innerJoin(locationTable, eq(locationTable.id, shiftTable.locationId))
    .where(eq(shiftTable.id, shiftId))
    .limit(1);

  if (!row) throw new Error("Shift not found.");

  const weekStart = mondayOfWeekContaining(row.shift.startsAt, row.location.timezone);
  const [published] = await db
    .select({ id: scheduleWeekTable.id })
    .from(scheduleWeekTable)
    .where(
      and(
        eq(scheduleWeekTable.locationId, row.location.id),
        eq(scheduleWeekTable.weekStartDate, weekStart),
      ),
    )
    .limit(1);

  if (!published) throw new Error("That week is not published.");

  return { ...row, weekStart, published: true };
}

export async function assertAssignedToShift(db: DbSession, shiftId: string, userId: string) {
  const [row] = await db
    .select({ id: shiftAssignmentTable.id })
    .from(shiftAssignmentTable)
    .where(and(eq(shiftAssignmentTable.shiftId, shiftId), eq(shiftAssignmentTable.userId, userId)))
    .limit(1);
  if (!row) throw new Error("You are not assigned to this shift.");
}

async function transferCoverageAssignment(
  db: DbSession,
  request: { shiftId: string; fromUserId: string; toUserId: string },
) {
  await db.transaction(async (tx) => {
    await tx
      .delete(shiftAssignmentTable)
      .where(
        and(
          eq(shiftAssignmentTable.shiftId, request.shiftId),
          eq(shiftAssignmentTable.userId, request.fromUserId),
        ),
      );

    await tx.insert(shiftAssignmentTable).values({
      id: crypto.randomUUID(),
      shiftId: request.shiftId,
      userId: request.toUserId,
    });
  });
}

export async function applyApprovedCoverageOn(
  db: DbSession,
  request: { kind: string; shiftId: string; fromUserId: string; toUserId: string | null },
) {
  if (!request.toUserId) {
    throw new Error("No one is on the other side of this request.");
  }
  await transferCoverageAssignment(db, { ...request, toUserId: request.toUserId });
}

export async function getDbAndExpire() {
  const db = await getDb();
  await expireOpenDrops(db);
  return db;
}
