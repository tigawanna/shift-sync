import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
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
  userSkill as userSkillTable,
} from "@/lib/drizzle/schema/skills-schema";
import {
  evaluateAssignmentConstraints,
  isPastEditCutoff,
  type AvailabilityWindow,
  type ShiftInterval,
} from "@/lib/schedule/constraints";
import { SKILLS } from "@/lib/schedule/skills";
import {
  addDaysYmd,
  formatDateInZone,
  formatTimeInZone,
  mondayOfWeekContaining,
  zonedWallTimeToUtc,
} from "@/lib/time/zoned";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, gt, gte, inArray, lt } from "drizzle-orm";
import { requireSessionRoles } from "../team/team.auth";
import {
  assignStaffInputSchema,
  createShiftInputSchema,
  listMyScheduleInputSchema,
  listWeekScheduleInputSchema,
  publishWeekInputSchema,
  shiftIdInputSchema,
  unassignStaffInputSchema,
  updateShiftInputSchema,
  type AssignStaffResult,
  type CreateShiftInput,
  type StaffCandidate,
  type UpdateShiftInput,
  type WeekSchedule,
  type WeekShift,
} from "./schedule.types";

async function assertLocationAccess(userId: string, role: string, locationId: string) {
  if (role === ROLE.admin) return;

  const db = await getDb();
  const [row] = await db
    .select({ id: userLocation.id })
    .from(userLocation)
    .where(and(eq(userLocation.userId, userId), eq(userLocation.locationId, locationId)))
    .limit(1);

  if (!row) {
    throw new Error("You can only manage schedules for locations you are assigned to.");
  }
}

async function getLocationOrThrow(locationId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(locationTable)
    .where(eq(locationTable.id, locationId))
    .limit(1);

  if (!row) {
    throw new Error("Location not found.");
  }

  return row;
}

function resolveShiftRange(input: {
  startDate: string;
  startTime: string;
  endTime: string;
  endDate?: string;
  timezone: string;
}) {
  const startsAt = zonedWallTimeToUtc(input.startDate, input.startTime, input.timezone);
  const endDate =
    input.endDate ??
    (input.endTime <= input.startTime ? addDaysYmd(input.startDate, 1) : input.startDate);
  const endsAt = zonedWallTimeToUtc(endDate, input.endTime, input.timezone);

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("Shift end must be after start. Overnight shifts can end the next morning.");
  }

  if (endsAt.getTime() - startsAt.getTime() > 16 * 3_600_000) {
    throw new Error("A single shift cannot be longer than 16 hours.");
  }

  return { startsAt, endsAt };
}

function mapWeekShift(input: {
  shift: typeof shiftTable.$inferSelect;
  locationName: string;
  timezone: string;
  skillName: string;
  assignees: WeekShift["assignees"];
  locked: boolean;
}): WeekShift {
  const startDate = formatDateInZone(input.shift.startsAt, input.timezone);
  const endDate = formatDateInZone(input.shift.endsAt, input.timezone);

  return {
    id: input.shift.id,
    locationId: input.shift.locationId,
    locationName: input.locationName,
    timezone: input.timezone,
    skillId: input.shift.skillId,
    skillName: input.skillName,
    startsAt: input.shift.startsAt,
    endsAt: input.shift.endsAt,
    startDate,
    startTime: formatTimeInZone(input.shift.startsAt, input.timezone),
    endDate,
    endTime: formatTimeInZone(input.shift.endsAt, input.timezone),
    overnight: startDate !== endDate,
    headcountNeeded: input.shift.headcountNeeded,
    assignedCount: input.assignees.length,
    notes: input.shift.notes,
    assignees: input.assignees,
    locked: input.locked,
  };
}

async function isWeekPublished(locationId: string, weekStart: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(scheduleWeekTable)
    .where(
      and(eq(scheduleWeekTable.locationId, locationId), eq(scheduleWeekTable.weekStartDate, weekStart)),
    )
    .limit(1);

  return row ?? null;
}

function weekRangeUtc(weekStart: string, timezone: string) {
  const start = zonedWallTimeToUtc(weekStart, "00:00", timezone);
  const end = zonedWallTimeToUtc(addDaysYmd(weekStart, 7), "00:00", timezone);
  return { start, end };
}

async function loadWeekSchedule(locationId: string, weekStart: string): Promise<WeekSchedule> {
  const location = await getLocationOrThrow(locationId);
  const { start, end } = weekRangeUtc(weekStart, location.timezone);
  const publication = await isWeekPublished(locationId, weekStart);
  const db = await getDb();

  const shiftRows = await db
    .select({
      shift: shiftTable,
      skillName: skillTable.name,
    })
    .from(shiftTable)
    .innerJoin(skillTable, eq(shiftTable.skillId, skillTable.id))
    .where(
      and(eq(shiftTable.locationId, locationId), gte(shiftTable.startsAt, start), lt(shiftTable.startsAt, end)),
    )
    .orderBy(shiftTable.startsAt);

  const shiftIds = shiftRows.map((row) => row.shift.id);
  const assignmentRows =
    shiftIds.length === 0
      ? []
      : await db
          .select({
            shiftId: shiftAssignmentTable.shiftId,
            userId: userTable.id,
            name: userTable.name,
          })
          .from(shiftAssignmentTable)
          .innerJoin(userTable, eq(shiftAssignmentTable.userId, userTable.id))
          .where(inArray(shiftAssignmentTable.shiftId, shiftIds));

  const assigneesByShift = new Map<string, WeekShift["assignees"]>();
  for (const row of assignmentRows) {
    const list = assigneesByShift.get(row.shiftId) ?? [];
    list.push({ userId: row.userId, name: row.name });
    assigneesByShift.set(row.shiftId, list);
  }

  const published = Boolean(publication);

  return {
    location: { id: location.id, name: location.name, timezone: location.timezone },
    weekStart,
    published,
    publishedAt: publication?.publishedAt ?? null,
    shifts: shiftRows.map((row) =>
      mapWeekShift({
        shift: row.shift,
        locationName: location.name,
        timezone: location.timezone,
        skillName: row.skillName,
        assignees: assigneesByShift.get(row.shift.id) ?? [],
        locked: published && isPastEditCutoff(row.shift.startsAt),
      }),
    ),
  };
}

async function getShiftContext(shiftId: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      shift: shiftTable,
      location: locationTable,
      skillName: skillTable.name,
    })
    .from(shiftTable)
    .innerJoin(locationTable, eq(shiftTable.locationId, locationTable.id))
    .innerJoin(skillTable, eq(shiftTable.skillId, skillTable.id))
    .where(eq(shiftTable.id, shiftId))
    .limit(1);

  if (!row) {
    throw new Error("Shift not found.");
  }

  const weekStart = mondayOfWeekContaining(row.shift.startsAt, row.location.timezone);
  const publication = await isWeekPublished(row.shift.locationId, weekStart);

  return { ...row, weekStart, published: Boolean(publication) };
}

function assertUnlocked(startsAt: Date, published: boolean, action: string) {
  if (published && isPastEditCutoff(startsAt)) {
    throw new Error(`Cannot ${action}: this published shift is inside the 48-hour cutoff.`);
  }
}

async function loadUserShiftIntervals(userIds: string[], rangeStart: Date, rangeEnd: Date) {
  if (userIds.length === 0) return [];

  const db = await getDb();
  return db
    .select({
      userId: shiftAssignmentTable.userId,
      shiftId: shiftTable.id,
      startsAt: shiftTable.startsAt,
      endsAt: shiftTable.endsAt,
      locationName: locationTable.name,
    })
    .from(shiftAssignmentTable)
    .innerJoin(shiftTable, eq(shiftAssignmentTable.shiftId, shiftTable.id))
    .innerJoin(locationTable, eq(shiftTable.locationId, locationTable.id))
    .where(
      and(
        inArray(shiftAssignmentTable.userId, userIds),
        lt(shiftTable.startsAt, rangeEnd),
        gt(shiftTable.endsAt, rangeStart),
      ),
    );
}

function intervalsForUser(
  rows: Array<{ userId: string; shiftId: string; startsAt: Date; endsAt: Date; locationName: string }>,
  userId: string,
  excludeShiftId?: string,
): ShiftInterval[] {
  return rows
    .filter((row) => row.userId === userId && row.shiftId !== excludeShiftId)
    .map((row) => ({
      id: row.shiftId,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      locationName: row.locationName,
    }));
}

export const listSkills = createServerFn({ method: "GET" }).handler(async () => {
  await requireSessionRoles([ROLE.admin, ROLE.manager, ROLE.staff]);
  return SKILLS;
});

export const listWeekSchedule = createServerFn({ method: "GET" })
  .validator((data: unknown) => listWeekScheduleInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    await assertLocationAccess(session.user.id, role, data.locationId);
    return loadWeekSchedule(data.locationId, data.weekStart);
  });

export const createShift = createServerFn({ method: "POST" })
  .validator((data: CreateShiftInput) => createShiftInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    await assertLocationAccess(session.user.id, role, data.locationId);

    const location = await getLocationOrThrow(data.locationId);
    const { startsAt, endsAt } = resolveShiftRange({ ...data, timezone: location.timezone });
    const weekStart = mondayOfWeekContaining(startsAt, location.timezone);
    const publication = await isWeekPublished(data.locationId, weekStart);
    assertUnlocked(startsAt, Boolean(publication), "create a shift");

    const db = await getDb();
    const id = crypto.randomUUID();

    await db.insert(shiftTable).values({
      id,
      locationId: data.locationId,
      skillId: data.skillId,
      startsAt,
      endsAt,
      headcountNeeded: data.headcountNeeded,
      notes: data.notes?.trim() || null,
      createdByUserId: session.user.id,
    });

    return loadWeekSchedule(data.locationId, weekStart);
  });

export const updateShift = createServerFn({ method: "POST" })
  .validator((data: UpdateShiftInput) => updateShiftInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertLocationAccess(session.user.id, role, context.shift.locationId);
    assertUnlocked(context.shift.startsAt, context.published, "edit this shift");

    const startDate = data.startDate ?? formatDateInZone(context.shift.startsAt, context.location.timezone);
    const startTime = data.startTime ?? formatTimeInZone(context.shift.startsAt, context.location.timezone);
    const endTime = data.endTime ?? formatTimeInZone(context.shift.endsAt, context.location.timezone);
    const endDate = data.endDate ?? formatDateInZone(context.shift.endsAt, context.location.timezone);
    const { startsAt, endsAt } = resolveShiftRange({
      startDate,
      startTime,
      endTime,
      endDate,
      timezone: context.location.timezone,
    });

    assertUnlocked(startsAt, context.published, "move this shift");

    const db = await getDb();
    const updates: Partial<typeof shiftTable.$inferInsert> = { startsAt, endsAt };
    if (data.skillId !== undefined) updates.skillId = data.skillId;
    if (data.headcountNeeded !== undefined) updates.headcountNeeded = data.headcountNeeded;
    if (data.notes !== undefined) updates.notes = data.notes?.trim() || null;

    await db.update(shiftTable).set(updates).where(eq(shiftTable.id, data.shiftId));

    const weekStart = mondayOfWeekContaining(startsAt, context.location.timezone);
    return loadWeekSchedule(context.shift.locationId, weekStart);
  });

export const deleteShift = createServerFn({ method: "POST" })
  .validator((data: unknown) => shiftIdInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertLocationAccess(session.user.id, role, context.shift.locationId);
    assertUnlocked(context.shift.startsAt, context.published, "delete this shift");

    const db = await getDb();
    await db.delete(shiftTable).where(eq(shiftTable.id, data.shiftId));
    return loadWeekSchedule(context.shift.locationId, context.weekStart);
  });

export const listStaffForShift = createServerFn({ method: "GET" })
  .validator((data: unknown) => shiftIdInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertLocationAccess(session.user.id, role, context.shift.locationId);

    const db = await getDb();
    const certified = await db
      .select({
        userId: userTable.id,
        name: userTable.name,
        email: userTable.email,
      })
      .from(userLocation)
      .innerJoin(userTable, eq(userLocation.userId, userTable.id))
      .where(and(eq(userLocation.locationId, context.shift.locationId), eq(userTable.role, ROLE.staff)));

    const userIds = certified.map((row) => row.userId);
    if (userIds.length === 0) return [] satisfies StaffCandidate[];

    const [skillRows, availabilityRows, assignmentOnShift, intervalRows] = await Promise.all([
      db
        .select({ userId: userSkillTable.userId, skillId: userSkillTable.skillId })
        .from(userSkillTable)
        .where(inArray(userSkillTable.userId, userIds)),
      db
        .select()
        .from(userAvailabilityTable)
        .where(inArray(userAvailabilityTable.userId, userIds)),
      db
        .select({ userId: shiftAssignmentTable.userId })
        .from(shiftAssignmentTable)
        .where(eq(shiftAssignmentTable.shiftId, data.shiftId)),
      loadUserShiftIntervals(
        userIds,
        new Date(context.shift.startsAt.getTime() - 10 * 3_600_000),
        new Date(context.shift.endsAt.getTime() + 7 * 24 * 3_600_000),
      ),
    ]);

    const skillsByUser = new Set(skillRows.map((row) => `${row.userId}:${row.skillId}`));
    const assigned = new Set(assignmentOnShift.map((row) => row.userId));
    const availabilityByUser = new Map<string, AvailabilityWindow[]>();
    for (const row of availabilityRows) {
      const list = availabilityByUser.get(row.userId) ?? [];
      list.push({ weekday: row.weekday, startMinute: row.startMinute, endMinute: row.endMinute });
      availabilityByUser.set(row.userId, list);
    }

    const candidates: StaffCandidate[] = certified.map((person) => {
      const { failures, warnings } = evaluateAssignmentConstraints({
        locationCertified: true,
        hasRequiredSkill: skillsByUser.has(`${person.userId}:${context.shift.skillId}`),
        alreadyAssigned: assigned.has(person.userId),
        candidateStartsAt: context.shift.startsAt,
        candidateEndsAt: context.shift.endsAt,
        locationTimezone: context.location.timezone,
        locationName: context.location.name,
        otherShifts: intervalsForUser(intervalRows, person.userId, data.shiftId),
        availability: availabilityByUser.get(person.userId) ?? [],
      });

      return {
        userId: person.userId,
        name: person.name,
        email: person.email,
        eligible: failures.length === 0,
        failures,
        warnings,
      };
    });

    return candidates.sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  });

export const assignStaffToShift = createServerFn({ method: "POST" })
  .validator((data: unknown) => assignStaffInputSchema.parse(data))
  .handler(async ({ data }): Promise<AssignStaffResult> => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertLocationAccess(session.user.id, role, context.shift.locationId);
    assertUnlocked(context.shift.startsAt, context.published, "change assignments");

    const db = await getDb();
    const [person] = await db
      .select({ id: userTable.id, name: userTable.name, role: userTable.role })
      .from(userTable)
      .where(eq(userTable.id, data.userId))
      .limit(1);

    if (!person || person.role !== ROLE.staff) {
      throw new Error("Only staff members can be assigned to shifts.");
    }

    const [certified] = await db
      .select({ id: userLocation.id })
      .from(userLocation)
      .where(and(eq(userLocation.userId, data.userId), eq(userLocation.locationId, context.shift.locationId)))
      .limit(1);

    const [hasSkill] = await db
      .select({ id: userSkillTable.id })
      .from(userSkillTable)
      .where(and(eq(userSkillTable.userId, data.userId), eq(userSkillTable.skillId, context.shift.skillId)))
      .limit(1);

    const [existingAssignment] = await db
      .select({ id: shiftAssignmentTable.id })
      .from(shiftAssignmentTable)
      .where(
        and(eq(shiftAssignmentTable.shiftId, data.shiftId), eq(shiftAssignmentTable.userId, data.userId)),
      )
      .limit(1);

    const [availabilityRows, intervalRows] = await Promise.all([
      db.select().from(userAvailabilityTable).where(eq(userAvailabilityTable.userId, data.userId)),
      loadUserShiftIntervals(
        [data.userId],
        new Date(context.shift.startsAt.getTime() - 10 * 3_600_000),
        new Date(context.shift.endsAt.getTime() + 7 * 24 * 3_600_000),
      ),
    ]);

    const { failures, warnings } = evaluateAssignmentConstraints({
      locationCertified: Boolean(certified),
      hasRequiredSkill: Boolean(hasSkill),
      alreadyAssigned: Boolean(existingAssignment),
      candidateStartsAt: context.shift.startsAt,
      candidateEndsAt: context.shift.endsAt,
      locationTimezone: context.location.timezone,
      locationName: context.location.name,
      otherShifts: intervalsForUser(intervalRows, data.userId, data.shiftId),
      availability: availabilityRows,
    });

    if (failures.length > 0) {
      const alternatives = await listStaffForShift({ data: { shiftId: data.shiftId } });
      return {
        ok: false,
        failures,
        suggestions: alternatives
          .filter((candidate) => candidate.eligible && candidate.userId !== data.userId)
          .slice(0, 3)
          .map((candidate) => ({ userId: candidate.userId, name: candidate.name })),
      };
    }

    await db.insert(shiftAssignmentTable).values({
      id: crypto.randomUUID(),
      shiftId: data.shiftId,
      userId: data.userId,
    });

    return { ok: true, warnings };
  });

export const unassignStaffFromShift = createServerFn({ method: "POST" })
  .validator((data: unknown) => unassignStaffInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertLocationAccess(session.user.id, role, context.shift.locationId);
    assertUnlocked(context.shift.startsAt, context.published, "change assignments");

    const db = await getDb();
    await db
      .delete(shiftAssignmentTable)
      .where(
        and(eq(shiftAssignmentTable.shiftId, data.shiftId), eq(shiftAssignmentTable.userId, data.userId)),
      );

    return { ok: true as const };
  });

export const publishWeek = createServerFn({ method: "POST" })
  .validator((data: unknown) => publishWeekInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    await assertLocationAccess(session.user.id, role, data.locationId);

    const existing = await isWeekPublished(data.locationId, data.weekStart);
    if (existing) {
      return loadWeekSchedule(data.locationId, data.weekStart);
    }

    const db = await getDb();
    await db.insert(scheduleWeekTable).values({
      id: crypto.randomUUID(),
      locationId: data.locationId,
      weekStartDate: data.weekStart,
      publishedAt: new Date(),
      publishedByUserId: session.user.id,
    });

    return loadWeekSchedule(data.locationId, data.weekStart);
  });

export const unpublishWeek = createServerFn({ method: "POST" })
  .validator((data: unknown) => publishWeekInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    await assertLocationAccess(session.user.id, role, data.locationId);

    const schedule = await loadWeekSchedule(data.locationId, data.weekStart);
    const lockedShift = schedule.shifts.find((shift) => shift.locked);
    if (lockedShift) {
      throw new Error(
        "Cannot unpublish: at least one shift in this week is inside the 48-hour cutoff.",
      );
    }

    const db = await getDb();
    await db
      .delete(scheduleWeekTable)
      .where(
        and(
          eq(scheduleWeekTable.locationId, data.locationId),
          eq(scheduleWeekTable.weekStartDate, data.weekStart),
        ),
      );

    return loadWeekSchedule(data.locationId, data.weekStart);
  });

export const listMySchedule = createServerFn({ method: "GET" })
  .validator((data: unknown) => listMyScheduleInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.admin, ROLE.staff]);
    const db = await getDb();

    const myLocations = await db
      .select({
        id: locationTable.id,
        name: locationTable.name,
        timezone: locationTable.timezone,
      })
      .from(userLocation)
      .innerJoin(locationTable, eq(userLocation.locationId, locationTable.id))
      .where(eq(userLocation.userId, session.user.id));

    if (myLocations.length === 0) {
      return { weekStart: data.weekStart, shifts: [] };
    }

    const publishedWeeks = await db
      .select()
      .from(scheduleWeekTable)
      .where(
        and(
          inArray(
            scheduleWeekTable.locationId,
            myLocations.map((location) => location.id),
          ),
          eq(scheduleWeekTable.weekStartDate, data.weekStart),
        ),
      );

    const publishedLocationIds = new Set(publishedWeeks.map((row) => row.locationId));
    if (publishedLocationIds.size === 0) {
      return { weekStart: data.weekStart, shifts: [] };
    }

    const assignmentRows = await db
      .select({
        shift: shiftTable,
        skillName: skillTable.name,
        location: locationTable,
      })
      .from(shiftAssignmentTable)
      .innerJoin(shiftTable, eq(shiftAssignmentTable.shiftId, shiftTable.id))
      .innerJoin(skillTable, eq(shiftTable.skillId, skillTable.id))
      .innerJoin(locationTable, eq(shiftTable.locationId, locationTable.id))
      .where(
        and(
          eq(shiftAssignmentTable.userId, session.user.id),
          inArray(shiftTable.locationId, [...publishedLocationIds]),
        ),
      )
      .orderBy(shiftTable.startsAt);

    const shifts = assignmentRows
      .filter((row) => {
        const localStart = formatDateInZone(row.shift.startsAt, row.location.timezone);
        return localStart >= data.weekStart && localStart <= addDaysYmd(data.weekStart, 6);
      })
      .map((row) =>
        mapWeekShift({
          shift: row.shift,
          locationName: row.location.name,
          timezone: row.location.timezone,
          skillName: row.skillName,
          assignees: [{ userId: session.user.id, name: session.user.name }],
          locked: true,
        }),
      );

    return { weekStart: data.weekStart, shifts };
  });
