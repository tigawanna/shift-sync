import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { cancelActiveCoverageForShift } from "@/lib/schedule/coverage.server";
import { recordScheduleAudit, snapshotShift } from "@/lib/schedule/audit.server";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import {
  scheduleWeek as scheduleWeekTable,
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import {
  skill as skillTable,
  userAvailability as userAvailabilityTable,
  userAvailabilityException as userAvailabilityExceptionTable,
  userSkill,
} from "@/lib/drizzle/schema/skills-schema";
import {
  clipWeeklyHours,
  evaluateAssignmentConstraints,
  formatAssignFailure,
  type ShiftInterval,
} from "@/lib/schedule/assign-constraints";
import {
  addDaysYmd,
  formatDateInZone,
  mondayOfWeekContaining,
  zonedWallTimeToUtc,
} from "@/lib/time/zoned";
import { createServerFn } from "@tanstack/react-start";
import { SHIFT_ASSIGN_STAFF_LIMIT } from "@/components/pagination/constants";
import {
  and,
  asc,
  count,
  eq,
  gt,
  gte,
  inArray,
  like,
  lt,
  lte,
  ne,
  notInArray,
  or,
} from "drizzle-orm";
import { z } from "zod";
import { assertManagerLocationAccess } from "./manager-locations.server";
import { cutoffInstant, EDIT_CUTOFF_HOURS } from "./manager-schedule.fn";

const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}/);

export const createManagerShiftInputSchema = z.object({
  locationId: z.string().min(1),
  skillId: z.string().min(1),
  startDate: ymdSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  headcountNeeded: z.number().int().min(1).max(20),
  notes: z.string().trim().max(500).optional(),
});

export const updateManagerShiftInputSchema = z.object({
  shiftId: z.string().min(1),
  skillId: z.string().min(1),
  startDate: ymdSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  headcountNeeded: z.number().int().min(1).max(20),
  notes: z.string().trim().max(500).optional(),
});

const shiftIdSchema = z.object({ shiftId: z.string().min(1) });

export const listStaffForManagerShiftInputSchema = z.object({
  shiftId: z.string().min(1),
  q: z.string().optional().default(""),
});

export const assignManagerShiftInputSchema = z.object({
  shiftId: z.string().min(1),
  userId: z.string().min(1),
  overrideReason: z.string().trim().min(8).max(280).optional(),
});

function wallTime(value: string) {
  return value.slice(0, 5);
}

function resolveShiftRange(input: {
  startDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
}) {
  const startTime = wallTime(input.startTime);
  const endTime = wallTime(input.endTime);
  const startsAt = zonedWallTimeToUtc(input.startDate, startTime, input.timezone);
  const endDate = endTime <= startTime ? addDaysYmd(input.startDate, 1) : input.startDate;
  const endsAt = zonedWallTimeToUtc(endDate, endTime, input.timezone);

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("Shift end must be after start. Overnight shifts can end the next morning.");
  }
  if (endsAt.getTime() - startsAt.getTime() > 16 * 3_600_000) {
    throw new Error("A single shift cannot be longer than 16 hours.");
  }

  return { startsAt, endsAt };
}

function assertCanMutate(startsAt: Date, published: boolean, action: string) {
  if (published && startsAt.getTime() < cutoffInstant().getTime()) {
    throw new Error(
      `Cannot ${action}: this published shift is inside the ${EDIT_CUTOFF_HOURS}-hour cutoff.`,
    );
  }
}

async function getShiftContext(shiftId: string) {
  const db = await getDb();
  const row = await db.query.shift.findFirst({
    where: eq(shiftTable.id, shiftId),
    with: {
      location: true,
      skill: { columns: { id: true, name: true } },
      assignments: { columns: { userId: true } },
    },
  });
  if (!row) throw new Error("Shift not found.");

  const weekStart = mondayOfWeekContaining(row.startsAt, row.location.timezone);
  const [publication] = await db
    .select({ id: scheduleWeekTable.id })
    .from(scheduleWeekTable)
    .where(
      and(
        eq(scheduleWeekTable.locationId, row.locationId),
        eq(scheduleWeekTable.weekStartDate, weekStart),
      ),
    )
    .limit(1);

  return { shift: row, weekStart, published: Boolean(publication) };
}

function constraintWindow(startsAt: Date, endsAt: Date, timezone: string) {
  const weekStart = mondayOfWeekContaining(startsAt, timezone);
  const weekEnd = addDaysYmd(weekStart, 7);
  const restPad = 36 * 3_600_000;
  const rangeStart = new Date(
    Math.min(
      zonedWallTimeToUtc(addDaysYmd(weekStart, -2), "00:00", timezone).getTime(),
      startsAt.getTime() - restPad,
    ),
  );
  const rangeEnd = new Date(
    Math.max(
      zonedWallTimeToUtc(addDaysYmd(weekEnd, 2), "00:00", timezone).getTime(),
      endsAt.getTime() + restPad,
    ),
  );
  return {
    rangeStart,
    rangeEnd,
    exceptionStart: formatDateInZone(rangeStart, timezone),
    exceptionEnd: formatDateInZone(rangeEnd, timezone),
  };
}

async function loadConstraintInputs(
  userIds: string[],
  shiftId: string,
  startsAt: Date,
  endsAt: Date,
  timezone: string,
) {
  const shiftsByUser = new Map<string, ShiftInterval[]>();
  const weeklyByUser = new Map<
    string,
    { weekday: number; startMinute: number; endMinute: number }[]
  >();
  const exceptionsByUser = new Map<
    string,
    { date: string; kind: "blocked" | "extra"; startMinute: number; endMinute: number }[]
  >();
  for (const userId of userIds) {
    shiftsByUser.set(userId, []);
    weeklyByUser.set(userId, []);
    exceptionsByUser.set(userId, []);
  }
  if (userIds.length === 0) {
    return { shiftsByUser, weeklyByUser, exceptionsByUser };
  }

  const window = constraintWindow(startsAt, endsAt, timezone);
  const db = await getDb();
  const [shiftRows, weeklyRows, exceptionRows] = await Promise.all([
    db
      .select({
        userId: shiftAssignmentTable.userId,
        id: shiftTable.id,
        startsAt: shiftTable.startsAt,
        endsAt: shiftTable.endsAt,
        locationName: locationTable.name,
      })
      .from(shiftAssignmentTable)
      .innerJoin(shiftTable, eq(shiftTable.id, shiftAssignmentTable.shiftId))
      .innerJoin(locationTable, eq(locationTable.id, shiftTable.locationId))
      .where(
        and(
          inArray(shiftAssignmentTable.userId, userIds),
          ne(shiftTable.id, shiftId),
          lt(shiftTable.startsAt, window.rangeEnd),
          gt(shiftTable.endsAt, window.rangeStart),
        ),
      ),
    db
      .select({
        userId: userAvailabilityTable.userId,
        weekday: userAvailabilityTable.weekday,
        startMinute: userAvailabilityTable.startMinute,
        endMinute: userAvailabilityTable.endMinute,
      })
      .from(userAvailabilityTable)
      .where(inArray(userAvailabilityTable.userId, userIds)),
    db
      .select({
        userId: userAvailabilityExceptionTable.userId,
        date: userAvailabilityExceptionTable.date,
        kind: userAvailabilityExceptionTable.kind,
        startMinute: userAvailabilityExceptionTable.startMinute,
        endMinute: userAvailabilityExceptionTable.endMinute,
      })
      .from(userAvailabilityExceptionTable)
      .where(
        and(
          inArray(userAvailabilityExceptionTable.userId, userIds),
          gte(userAvailabilityExceptionTable.date, window.exceptionStart),
          lte(userAvailabilityExceptionTable.date, window.exceptionEnd),
        ),
      ),
  ]);

  for (const row of shiftRows) {
    shiftsByUser.get(row.userId)?.push({
      id: row.id,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      locationName: row.locationName,
    });
  }
  for (const row of weeklyRows) {
    weeklyByUser.get(row.userId)?.push({
      weekday: row.weekday,
      startMinute: row.startMinute,
      endMinute: row.endMinute,
    });
  }
  for (const row of exceptionRows) {
    const kind = row.kind === "extra" ? "extra" : "blocked";
    exceptionsByUser.get(row.userId)?.push({
      date: row.date,
      kind,
      startMinute: row.startMinute,
      endMinute: row.endMinute,
    });
  }

  return { shiftsByUser, weeklyByUser, exceptionsByUser };
}

export const listManagerSkills = createServerFn({ method: "GET" }).handler(async () => {
  await requireSessionRoles([ROLE.manager]);
  const db = await getDb();
  return db
    .select({ id: skillTable.id, name: skillTable.name })
    .from(skillTable)
    .orderBy(asc(skillTable.name));
});

function staffNameSearch(q: string) {
  const trimmed = q.trim();
  if (!trimmed) return undefined;
  const pattern = `%${trimmed}%`;
  return or(like(userTable.name, pattern), like(userTable.email, pattern));
}

export const listStaffForManagerShift = createServerFn({ method: "GET" })
  .validator(listStaffForManagerShiftInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertManagerLocationAccess(session.user.id, context.shift.locationId);

    const assignedIds = context.shift.assignments?.map((row) => row.userId) ?? [];
    const db = await getDb();
    const eligible = and(
      eq(userLocation.locationId, context.shift.locationId),
      eq(userSkill.skillId, context.shift.skillId),
    );

    const assignedRows =
      assignedIds.length === 0
        ? []
        : await db
            .select({
              id: userTable.id,
              name: userTable.name,
              email: userTable.email,
            })
            .from(userTable)
            .where(inArray(userTable.id, assignedIds))
            .orderBy(asc(userTable.name));

    const candidateWhere = and(
      eligible,
      assignedIds.length > 0 ? notInArray(userTable.id, assignedIds) : undefined,
      staffNameSearch(data.q),
    );

    const [candidateRows, totalRow] = await Promise.all([
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
        .limit(SHIFT_ASSIGN_STAFF_LIMIT),
      db
        .select({ total: count() })
        .from(userTable)
        .innerJoin(userLocation, eq(userLocation.userId, userTable.id))
        .innerJoin(userSkill, eq(userSkill.userId, userTable.id))
        .where(candidateWhere),
    ]);

    const constraintUserIds = [
      ...new Set([...assignedRows.map((row) => row.id), ...candidateRows.map((row) => row.id)]),
    ];
    const { shiftsByUser, weeklyByUser, exceptionsByUser } = await loadConstraintInputs(
      constraintUserIds,
      context.shift.id,
      context.shift.startsAt,
      context.shift.endsAt,
      context.shift.location.timezone,
    );
    const weekStart = mondayOfWeekContaining(
      context.shift.startsAt,
      context.shift.location.timezone,
    );

    const candidates = candidateRows.map((person) => {
      const result = evaluateAssignmentConstraints({
        candidateStartsAt: context.shift.startsAt,
        candidateEndsAt: context.shift.endsAt,
        locationTimezone: context.shift.location.timezone,
        locationName: context.shift.location.name,
        otherShifts: shiftsByUser.get(person.id) ?? [],
        weekly: weeklyByUser.get(person.id) ?? [],
        exceptions: exceptionsByUser.get(person.id) ?? [],
      });
      return {
        ...person,
        assigned: false as const,
        blockers: result.failures
          .filter((issue) => issue.rule !== "consecutive_days")
          .map((issue) => issue.message),
        warnings: result.warnings.map((issue) => issue.message),
        requiresOverride: result.requiresOverride,
        weeklyHoursAfter: result.weeklyHours,
      };
    });

    return {
      assigned: assignedRows.map((person) => ({
        ...person,
        assigned: true as const,
        blockers: [] as string[],
        warnings: [] as string[],
        requiresOverride: false,
        weeklyHoursAfter: clipWeeklyHours(
          [
            ...(shiftsByUser.get(person.id) ?? []),
            { startsAt: context.shift.startsAt, endsAt: context.shift.endsAt },
          ],
          weekStart,
          context.shift.location.timezone,
        ),
      })),
      candidates,
      totalCandidates: totalRow[0]?.total ?? 0,
    };
  });

export const createManagerShift = createServerFn({ method: "POST" })
  .validator(createManagerShiftInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const location = await assertManagerLocationAccess(session.user.id, data.locationId);
    const { startsAt, endsAt } = resolveShiftRange({ ...data, timezone: location.timezone });
    const weekStart = mondayOfWeekContaining(startsAt, location.timezone);
    const db = await getDb();
    const [publication] = await db
      .select({ id: scheduleWeekTable.id })
      .from(scheduleWeekTable)
      .where(
        and(
          eq(scheduleWeekTable.locationId, location.id),
          eq(scheduleWeekTable.weekStartDate, weekStart),
        ),
      )
      .limit(1);

    assertCanMutate(startsAt, Boolean(publication), "create a shift");

    const shiftId = crypto.randomUUID();
    await db.insert(shiftTable).values({
      id: shiftId,
      locationId: location.id,
      skillId: data.skillId,
      startsAt,
      endsAt,
      headcountNeeded: data.headcountNeeded,
      notes: data.notes?.trim() || null,
      createdByUserId: session.user.id,
    });
    await recordScheduleAudit(db, {
      locationId: location.id,
      shiftId,
      actorUserId: session.user.id,
      action: "create",
      after: await snapshotShift(db, shiftId),
    });

    return { weekStart };
  });

export const updateManagerShift = createServerFn({ method: "POST" })
  .validator(updateManagerShiftInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertManagerLocationAccess(session.user.id, context.shift.locationId);
    assertCanMutate(context.shift.startsAt, context.published, "edit this shift");

    const { startsAt, endsAt } = resolveShiftRange({
      startDate: data.startDate,
      startTime: data.startTime,
      endTime: data.endTime,
      timezone: context.shift.location.timezone,
    });
    assertCanMutate(startsAt, context.published, "move this shift");

    const db = await getDb();
    const before = await snapshotShift(db, data.shiftId);
    await db
      .update(shiftTable)
      .set({
        skillId: data.skillId,
        startsAt,
        endsAt,
        headcountNeeded: data.headcountNeeded,
        notes: data.notes?.trim() || null,
      })
      .where(eq(shiftTable.id, data.shiftId));
    await cancelActiveCoverageForShift(db, data.shiftId, session.user.id);
    await recordScheduleAudit(db, {
      locationId: context.shift.locationId,
      shiftId: data.shiftId,
      actorUserId: session.user.id,
      action: "update",
      before,
      after: await snapshotShift(db, data.shiftId),
    });

    return { weekStart: mondayOfWeekContaining(startsAt, context.shift.location.timezone) };
  });

export const deleteManagerShift = createServerFn({ method: "POST" })
  .validator(shiftIdSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertManagerLocationAccess(session.user.id, context.shift.locationId);
    assertCanMutate(context.shift.startsAt, context.published, "delete this shift");

    const db = await getDb();
    const before = await snapshotShift(db, data.shiftId);
    await cancelActiveCoverageForShift(db, data.shiftId, session.user.id);
    await db.delete(shiftTable).where(eq(shiftTable.id, data.shiftId));
    await recordScheduleAudit(db, {
      locationId: context.shift.locationId,
      shiftId: data.shiftId,
      actorUserId: session.user.id,
      action: "delete",
      before,
    });
    return { weekStart: context.weekStart };
  });

export const assignManagerShift = createServerFn({ method: "POST" })
  .validator(assignManagerShiftInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertManagerLocationAccess(session.user.id, context.shift.locationId);
    assertCanMutate(context.shift.startsAt, context.published, "change assignments");

    const db = await getDb();
    const [eligible] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .innerJoin(
        userLocation,
        and(
          eq(userLocation.userId, userTable.id),
          eq(userLocation.locationId, context.shift.locationId),
        ),
      )
      .innerJoin(
        userSkill,
        and(eq(userSkill.userId, userTable.id), eq(userSkill.skillId, context.shift.skillId)),
      )
      .where(eq(userTable.id, data.userId))
      .limit(1);

    if (!eligible) {
      throw new Error("Only staff with this skill and location certification can be assigned.");
    }

    const eligibleIds = (
      await db
        .select({ id: userTable.id, name: userTable.name })
        .from(userTable)
        .innerJoin(
          userLocation,
          and(
            eq(userLocation.userId, userTable.id),
            eq(userLocation.locationId, context.shift.locationId),
          ),
        )
        .innerJoin(
          userSkill,
          and(eq(userSkill.userId, userTable.id), eq(userSkill.skillId, context.shift.skillId)),
        )
    ).map((row) => row);

    const { shiftsByUser, weeklyByUser, exceptionsByUser } = await loadConstraintInputs(
      eligibleIds.map((row) => row.id),
      context.shift.id,
      context.shift.startsAt,
      context.shift.endsAt,
      context.shift.location.timezone,
    );

    const evaluations = new Map(
      eligibleIds.map((person) => {
        const result = evaluateAssignmentConstraints({
          candidateStartsAt: context.shift.startsAt,
          candidateEndsAt: context.shift.endsAt,
          locationTimezone: context.shift.location.timezone,
          locationName: context.shift.location.name,
          otherShifts: shiftsByUser.get(person.id) ?? [],
          weekly: weeklyByUser.get(person.id) ?? [],
          exceptions: exceptionsByUser.get(person.id) ?? [],
        });
        return [person.id, result] as const;
      }),
    );

    const candidate = evaluations.get(data.userId);
    if (!candidate) {
      throw new Error("Only staff with this skill and location certification can be assigned.");
    }

    const alternativeNames = eligibleIds
      .filter((person) => {
        if (person.id === data.userId) return false;
        const other = evaluations.get(person.id);
        if (!other) return false;
        return other.failures.filter((issue) => issue.rule !== "consecutive_days").length === 0;
      })
      .map((person) => person.name);

    let failures = candidate.failures;
    if (candidate.requiresOverride) {
      if (!data.overrideReason) {
        throw new Error(formatAssignFailure(failures, alternativeNames));
      }
      failures = failures.filter((issue) => issue.rule !== "consecutive_days");
    }

    const hard = failures.filter((issue) => issue.rule !== "consecutive_days");
    if (hard.length > 0) {
      throw new Error(formatAssignFailure(hard, alternativeNames));
    }

    await db.insert(shiftAssignmentTable).values({
      id: crypto.randomUUID(),
      shiftId: data.shiftId,
      userId: data.userId,
      overrideReason: data.overrideReason ?? null,
    });
    await recordScheduleAudit(db, {
      locationId: context.shift.locationId,
      shiftId: data.shiftId,
      actorUserId: session.user.id,
      action: "assign",
      after: await snapshotShift(db, data.shiftId),
    });

    return { ok: true as const };
  });

export const unassignManagerShiftInputSchema = z.object({
  shiftId: z.string().min(1),
  userId: z.string().min(1),
});

export const unassignManagerShift = createServerFn({ method: "POST" })
  .validator(unassignManagerShiftInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertManagerLocationAccess(session.user.id, context.shift.locationId);
    assertCanMutate(context.shift.startsAt, context.published, "change assignments");

    const db = await getDb();
    const before = await snapshotShift(db, data.shiftId);
    await db
      .delete(shiftAssignmentTable)
      .where(
        and(
          eq(shiftAssignmentTable.shiftId, data.shiftId),
          eq(shiftAssignmentTable.userId, data.userId),
        ),
      );
    await recordScheduleAudit(db, {
      locationId: context.shift.locationId,
      shiftId: data.shiftId,
      actorUserId: session.user.id,
      action: "unassign",
      before,
      after: await snapshotShift(db, data.shiftId),
    });

    return { ok: true as const };
  });
