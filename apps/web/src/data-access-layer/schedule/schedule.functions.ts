import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { skill as skillTable } from "@/lib/drizzle/schema/skills-schema";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import {
  scheduleWeek as scheduleWeekTable,
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import {
  EDIT_CUTOFF_HOURS,
  isPastEditCutoff,
} from "@/lib/schedule/constraints";
import { SKILLS } from "@/lib/schedule/skills";
import {
  addDaysYmd,
  eachYmdInclusive,
  formatDateInZone,
  formatTimeInZone,
  minutesFromMidnight,
  mondayOfWeekContaining,
  monthGridDates,
  monthStartYmd,
  addMonthsYm,
  weekdayInZone,
  zonedWallTimeToUtc,
} from "@/lib/time/zoned";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, exists } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { requireSessionRoles } from "../team/team.auth";
import {
  bucketShiftsByDay,
  flagsToConstraintMessages,
  loadLocationBounds,
  loadLocationRangeBounds,
  loadPublishedWeekBounds,
  mapShiftSqlRow,
  calendarWeekStarts,
  queryPersonCalendarWeekStatsSql,
  queryAssignmentInstantsSql,
  queryLockedShiftExistsSql,
  queryOverlappingPeopleSql,
  queryOverlappingShiftsSql,
  queryStaffFlagsForShiftSql,
  queryUserWeekHoursSql,
  queryWeekShiftsSql,
  weekBoundsForLocation,
} from "./schedule.sql";
import { computeLocationMovePreview } from "./schedule.move-preview";
import {
  assignStaffInputSchema,
  createShiftInputSchema,
  listMyScheduleInputSchema,
  listMonthOverviewInputSchema,
  listOverviewDayInputSchema,
  listUserScheduleInputSchema,
  listDayAssignableShiftsInputSchema,
  previewLocationMoveInputSchema,
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

async function assertCanViewUser(viewerId: string, role: string, targetUserId: string) {
  if (role === ROLE.admin) return;

  const db = await getDb();
  const staffLoc = alias(userLocation, "staff_loc");
  const managerLoc = alias(userLocation, "manager_loc");
  const [row] = await db
    .select({ id: staffLoc.id })
    .from(staffLoc)
    .where(
      and(
        eq(staffLoc.userId, targetUserId),
        exists(
          db
            .select({ id: managerLoc.id })
            .from(managerLoc)
            .where(and(eq(managerLoc.userId, viewerId), eq(managerLoc.locationId, staffLoc.locationId))),
        ),
      ),
    )
    .limit(1);

  if (!row) {
    throw new Error("You can only view people who work at your locations.");
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

async function getAccessibleLocations(userId: string, role: string) {
  const db = await getDb();
  if (role === ROLE.admin) {
    return db
      .select({
        id: locationTable.id,
        name: locationTable.name,
        timezone: locationTable.timezone,
      })
      .from(locationTable)
      .orderBy(locationTable.name);
  }

  return db
    .select({
      id: locationTable.id,
      name: locationTable.name,
      timezone: locationTable.timezone,
    })
    .from(locationTable)
    .innerJoin(userLocation, eq(userLocation.locationId, locationTable.id))
    .where(eq(userLocation.userId, userId))
    .orderBy(locationTable.name);
}

async function loadWeekSchedule(locationId: string, weekStart: string): Promise<WeekSchedule> {
  const location = await getLocationOrThrow(locationId);
  const publication = await isWeekPublished(locationId, weekStart);
  const bounds = await loadLocationBounds([locationId], weekStart);
  const shifts = await queryWeekShiftsSql({ bounds, weekStart });

  return {
    location: { id: location.id, name: location.name, timezone: location.timezone },
    weekStart,
    published: Boolean(publication),
    publishedAt: publication?.publishedAt ?? null,
    shifts,
    days: bucketShiftsByDay(weekStart, shifts),
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

async function staffCandidatesForShift(context: Awaited<ReturnType<typeof getShiftContext>>) {
  const startsAt = context.shift.startsAt;
  const endsAt = context.shift.endsAt;
  const tz = context.location.timezone;
  const localStart = formatDateInZone(startsAt, tz);
  const dayStartMs = zonedWallTimeToUtc(localStart, "00:00", tz).getTime();
  const dayEndMs = zonedWallTimeToUtc(addDaysYmd(localStart, 1), "00:00", tz).getTime();
  const weekStart = mondayOfWeekContaining(startsAt, tz);
  const weekBounds = weekBoundsForLocation(weekStart, tz);
  const candidateHours = (endsAt.getTime() - startsAt.getTime()) / 3_600_000;

  const flags = await queryStaffFlagsForShiftSql({
    locationId: context.shift.locationId,
    skillId: context.shift.skillId,
    shiftId: context.shift.id,
    startsAtMs: startsAt.getTime(),
    endsAtMs: endsAt.getTime(),
    dayStartMs,
    dayEndMs,
    weekStartMs: weekBounds.startMs,
    weekEndMs: weekBounds.endMs,
    weekdayStart: weekdayInZone(startsAt, tz),
    startMinute: minutesFromMidnight(startsAt, tz),
    weekdayEnd: weekdayInZone(new Date(endsAt.getTime() - 60_000), tz),
    endMinute: minutesFromMidnight(new Date(endsAt.getTime() - 60_000), tz),
    candidateHours,
  });

  return flags.map((row) => {
    const { failures, warnings, eligible } = flagsToConstraintMessages(row, context.location.name);
    return {
      userId: row.userId,
      name: row.name,
      email: row.email,
      eligible,
      failures,
      warnings,
    } satisfies StaffCandidate;
  });
}

export const listStaffForShift = createServerFn({ method: "GET" })
  .validator((data: unknown) => shiftIdInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertLocationAccess(session.user.id, role, context.shift.locationId);
    return staffCandidatesForShift(context);
  });

async function performAssign(input: {
  actorId: string;
  role: string;
  shiftId: string;
  userId: string;
}): Promise<AssignStaffResult> {
  const context = await getShiftContext(input.shiftId);
  await assertLocationAccess(input.actorId, input.role, context.shift.locationId);
  assertUnlocked(context.shift.startsAt, context.published, "change assignments");

  const db = await getDb();
  const candidates = await staffCandidatesForShift(context);
  const personFlags = candidates.find((candidate) => candidate.userId === input.userId);

  if (!personFlags) {
    throw new Error("Only staff certified at this location can be assigned.");
  }

  if (!personFlags.eligible) {
    return {
      ok: false,
      failures: personFlags.failures,
      suggestions: candidates
        .filter((candidate) => candidate.eligible && candidate.userId !== input.userId)
        .slice(0, 3)
        .map((candidate) => ({ userId: candidate.userId, name: candidate.name })),
    };
  }

  await db.insert(shiftAssignmentTable).values({
    id: crypto.randomUUID(),
    shiftId: input.shiftId,
    userId: input.userId,
  });

  return { ok: true, warnings: personFlags.warnings };
}

export const assignStaffToShift = createServerFn({ method: "POST" })
  .validator((data: unknown) => assignStaffInputSchema.parse(data))
  .handler(async ({ data }): Promise<AssignStaffResult> => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    return performAssign({
      actorId: session.user.id,
      role,
      shiftId: data.shiftId,
      userId: data.userId,
    });
  });

async function certifyStaffAtLocation(userId: string, locationId: string) {
  const db = await getDb();
  const [existing] = await db
    .select({ id: userLocation.id })
    .from(userLocation)
    .where(and(eq(userLocation.userId, userId), eq(userLocation.locationId, locationId)))
    .limit(1);
  if (existing) return;
  await db.insert(userLocation).values({
    id: crypto.randomUUID(),
    userId,
    locationId,
  }).onConflictDoNothing();
}

export const listDayAssignableShifts = createServerFn({ method: "GET" })
  .validator((data: unknown) => listDayAssignableShiftsInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    await assertCanViewUser(session.user.id, role, data.userId);
    const locations = await getAccessibleLocations(session.user.id, role);
    const bounds = await loadLocationRangeBounds(
      locations.map((location) => location.id),
      data.date,
      addDaysYmd(data.date, 1),
    );
    return queryOverlappingShiftsSql({ bounds });
  });

export const assignStaffToCalendarShift = createServerFn({ method: "POST" })
  .validator((data: unknown) => assignStaffInputSchema.parse(data))
  .handler(async ({ data }): Promise<AssignStaffResult> => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    await assertCanViewUser(session.user.id, role, data.userId);
    const context = await getShiftContext(data.shiftId);
    await assertLocationAccess(session.user.id, role, context.shift.locationId);
    await certifyStaffAtLocation(data.userId, context.shift.locationId);
    return performAssign({
      actorId: session.user.id,
      role,
      shiftId: data.shiftId,
      userId: data.userId,
    });
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

    const cutoffMs = Date.now() + EDIT_CUTOFF_HOURS * 3_600_000;
    const locked = await queryLockedShiftExistsSql(data.locationId, data.weekStart, cutoffMs);
    if (locked) {
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
      .select({ id: userLocation.locationId })
      .from(userLocation)
      .where(eq(userLocation.userId, session.user.id));
    const locationIds = myLocations.map((location) => location.id);
    const grid = monthGridDates(data.month);
    const bounds = await loadLocationRangeBounds(
      locationIds,
      grid[0] ?? monthStartYmd(data.month),
      addDaysYmd(grid[grid.length - 1] ?? monthStartYmd(data.month), 1),
    );
    const publishedBounds = await loadPublishedWeekBounds(locationIds);
    const shifts = await queryOverlappingShiftsSql({
      bounds,
      assigneeUserId: session.user.id,
      publishedOnlyBounds: publishedBounds,
    });
    const monthBounds = await loadLocationRangeBounds(
      locationIds,
      monthStartYmd(data.month),
      monthStartYmd(addMonthsYm(data.month, 1)),
    );
    const monthlyHours = await queryUserWeekHoursSql(session.user.id, monthBounds);
    const weekStats = await queryPersonCalendarWeekStatsSql({
      userId: session.user.id,
      locationIds,
      weekStarts: calendarWeekStarts(data.month),
      publishedOnlyBounds: publishedBounds,
    });

    return {
      userId: session.user.id,
      name: session.user.name,
      email: session.user.email,
      month: data.month,
      monthlyHours,
      shifts,
      weekStats,
    };
  });

export const listMonthOverview = createServerFn({ method: "GET" })
  .validator((data: unknown) => listMonthOverviewInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    const locations = await getAccessibleLocations(session.user.id, role);
    const grid = monthGridDates(data.month);
    const start = grid[0] ?? monthStartYmd(data.month);
    const endExclusive = addDaysYmd(grid[grid.length - 1] ?? start, 1);
    const bounds = await loadLocationRangeBounds(
      locations.map((location) => location.id),
      start,
      endExclusive,
    );
    const instants = await queryAssignmentInstantsSql(bounds);
    const usersByDate = new Map<string, Set<string>>();

    for (const row of instants) {
      const startsAt = new Date(row.starts_at);
      const endsAt = new Date(row.ends_at);
      const startDate = formatDateInZone(startsAt, row.timezone);
      const endDate = formatDateInZone(endsAt, row.timezone);
      for (const date of eachYmdInclusive(startDate, endDate)) {
        const bucket = usersByDate.get(date) ?? new Set<string>();
        bucket.add(row.user_id);
        usersByDate.set(date, bucket);
      }
    }

    return {
      month: data.month,
      days: grid.map((date) => ({
        date,
        staffCount: usersByDate.get(date)?.size ?? 0,
      })),
    };
  });

export const listOverviewDay = createServerFn({ method: "GET" })
  .validator((data: unknown) => listOverviewDayInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    const locations = await getAccessibleLocations(session.user.id, role);
    const bounds = await loadLocationRangeBounds(
      locations.map((location) => location.id),
      data.date,
      addDaysYmd(data.date, 1),
    );
    const rows = await queryOverlappingPeopleSql(bounds);
    const byLocation = new Map<
      string,
      {
        location: { id: string; name: string; timezone: string };
        people: Map<string, { userId: string; name: string; email: string; shifts: ReturnType<typeof mapShiftSqlRow>[] }>;
      }
    >();

    for (const row of rows) {
      const shift = mapShiftSqlRow(row);
      const block =
        byLocation.get(row.location_id) ??
        {
          location: {
            id: row.location_id,
            name: row.location_name,
            timezone: row.timezone,
          },
          people: new Map(),
        };
      const person =
        block.people.get(row.user_id) ??
        {
          userId: row.user_id,
          name: row.user_name,
          email: row.user_email,
          shifts: [],
        };
      person.shifts.push(shift);
      block.people.set(row.user_id, person);
      byLocation.set(row.location_id, block);
    }

    return {
      date: data.date,
      locations: [...byLocation.values()].map((block) => ({
        location: block.location,
        people: [...block.people.values()],
      })),
    };
  });

export const listUserSchedule = createServerFn({ method: "GET" })
  .validator((data: unknown) => listUserScheduleInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    await assertCanViewUser(session.user.id, role, data.userId);

    const db = await getDb();
    const [userRow] = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
      })
      .from(userTable)
      .where(eq(userTable.id, data.userId))
      .limit(1);

    if (!userRow) {
      throw new Error("User not found.");
    }

    const locations = await db
      .select({ id: userLocation.locationId })
      .from(userLocation)
      .where(eq(userLocation.userId, data.userId));
    const locationIds = locations.map((location) => location.id);
    const grid = monthGridDates(data.month);
    const bounds = await loadLocationRangeBounds(
      locationIds,
      grid[0] ?? monthStartYmd(data.month),
      addDaysYmd(grid[grid.length - 1] ?? monthStartYmd(data.month), 1),
    );
    const shifts = await queryOverlappingShiftsSql({
      bounds,
      assigneeUserId: data.userId,
    });
    const monthBounds = await loadLocationRangeBounds(
      locationIds,
      monthStartYmd(data.month),
      monthStartYmd(addMonthsYm(data.month, 1)),
    );
    const monthlyHours = await queryUserWeekHoursSql(data.userId, monthBounds);
    const weekStats = await queryPersonCalendarWeekStatsSql({
      userId: data.userId,
      locationIds,
      weekStarts: calendarWeekStarts(data.month),
    });

    return {
      userId: userRow.id,
      name: userRow.name,
      email: userRow.email,
      month: data.month,
      monthlyHours,
      shifts,
      weekStats,
    };
  });

export const previewLocationMove = createServerFn({ method: "GET" })
  .validator((data: unknown) => previewLocationMoveInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session, role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);
    await assertCanViewUser(session.user.id, role, data.userId);
    const locationIds = data.locationIdsCsv
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    return computeLocationMovePreview({
      viewerId: session.user.id,
      role,
      userId: data.userId,
      locationIds,
      weekStart: data.weekStart,
    });
  });
