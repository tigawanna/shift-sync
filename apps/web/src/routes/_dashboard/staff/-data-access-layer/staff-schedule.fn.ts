import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import {
  scheduleWeek as scheduleWeekTable,
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import { skill as skillTable } from "@/lib/drizzle/schema/skills-schema";
import {
  addDaysYmd,
  addMonthsYm,
  formatDateInZone,
  formatDayLabel,
  formatMonthLabel,
  formatTimeInZone,
  mondayOfWeekContaining,
  monthStartYmd,
  yearMonthOf,
  zonedWallTimeToUtc,
} from "@/lib/time/zoned";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, eq, gt, lt } from "drizzle-orm";
import { z } from "zod";

export const listMyStaffScheduleInputSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM"),
});

export type ListMyStaffScheduleInput = z.infer<typeof listMyStaffScheduleInputSchema>;

// Pad ±1 day in UTC so overnight/timezone shifts at the month edges still overlap SQL.
function monthUtcOverlapRange(month: string) {
  const monthStart = monthStartYmd(month);
  const monthEndExclusive = monthStartYmd(addMonthsYm(month, 1));

  return {
    rangeStart: zonedWallTimeToUtc(addDaysYmd(monthStart, -1), "00:00", "UTC"),
    rangeEnd: zonedWallTimeToUtc(addDaysYmd(monthEndExclusive, 1), "00:00", "UTC"),
  };
}

// Assigned shifts at locations this person is certified for, overlapping the padded month.
async function selectMyAssignments(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
  month: string,
) {
  const { rangeStart, rangeEnd } = monthUtcOverlapRange(month);

  return db
    .select({
      shift: shiftTable,
      location: locationTable,
      skill: skillTable,
    })
    .from(shiftAssignmentTable)
    .innerJoin(shiftTable, eq(shiftAssignmentTable.shiftId, shiftTable.id))
    .innerJoin(locationTable, eq(shiftTable.locationId, locationTable.id))
    // Drop assignments at locations they are no longer certified for.
    .innerJoin(
      userLocation,
      and(
        eq(userLocation.userId, userId),
        eq(userLocation.locationId, shiftTable.locationId),
      ),
    )
    .innerJoin(skillTable, eq(shiftTable.skillId, skillTable.id))
    .where(
      and(
        eq(shiftAssignmentTable.userId, userId),
        lt(shiftTable.startsAt, rangeEnd),
        gt(shiftTable.endsAt, rangeStart),
      ),
    )
    .orderBy(asc(shiftTable.startsAt));
}

// Published location-weeks this person can see (same certification join as assignments).
async function selectMyPublishedWeeks(db: Awaited<ReturnType<typeof getDb>>, userId: string) {
  return db
    .select({
      locationId: scheduleWeekTable.locationId,
      weekStartDate: scheduleWeekTable.weekStartDate,
    })
    .from(scheduleWeekTable)
    .innerJoin(
      userLocation,
      and(
        eq(userLocation.userId, userId),
        eq(userLocation.locationId, scheduleWeekTable.locationId),
      ),
    );
}

async function loadMyStaffSchedule(month: string, userId: string) {
  const db = await getDb();
  const { rangeStart, rangeEnd } = monthUtcOverlapRange(month);

  // const 

  // Assignments, published weeks, and certified-location count in one round.
  const [assignmentRows, publishedWeeks, certifiedLocationCount] = await Promise.all([
    selectMyAssignments(db, userId, month),
    selectMyPublishedWeeks(db, userId),
    db
      .select({ total: count() })
      .from(userLocation)
      .where(eq(userLocation.userId, userId))
      .then((rows) => rows[0]?.total ?? 0),
  ]);

  // Lookup of "locationId:Monday" for published weeks.
  const publishedWeekKeys = new Set(
    publishedWeeks.map((week) => `${week.locationId}:${week.weekStartDate}`),
  );

  // Convert UTC instants into the location clock and mark publish state.
  const mapped = assignmentRows.map((row) => {
    const startsAt = row.shift.startsAt;
    const endsAt = row.shift.endsAt;
    const timezone = row.location.timezone;
    const startDate = formatDateInZone(startsAt, timezone);
    const endDate = formatDateInZone(endsAt, timezone);
    return {
      id: row.shift.id,
      locationId: row.location.id,
      locationName: row.location.name,
      timezone,
      skillId: row.skill.id,
      skillName: row.skill.name,
      startsAt,
      endsAt,
      startDate,
      endDate,
      startTime: formatTimeInZone(startsAt, timezone),
      endTime: formatTimeInZone(endsAt, timezone),
      overnight: startDate !== endDate,
      hours: (endsAt.getTime() - startsAt.getTime()) / 3_600_000,
      published: publishedWeekKeys.has(
        `${row.location.id}:${mondayOfWeekContaining(startsAt, timezone)}`,
      ),
      notes: row.shift.notes,
    };
  });

  // Staff only see published weeks.
  const publishedShifts = mapped.filter((shift) => shift.published);
  // SQL used a padded UTC window; keep only shifts whose local start is in this month.
  const monthShifts = publishedShifts.filter((shift) => yearMonthOf(shift.startDate) === month);
  // One group per local start date for the list UI.
  const days = [...new Set(monthShifts.map((shift) => shift.startDate))]
    .sort()
    .map((date) => ({
      date,
      label: formatDayLabel(date),
      shifts: monthShifts.filter((shift) => shift.startDate === date),
    }));

  return {
    month,
    monthLabel: formatMonthLabel(month),
    monthlyHours: monthShifts.reduce((total, shift) => total + shift.hours, 0),
    days,
    meta: {
      locationCount: certifiedLocationCount,
      publishedWeekCount: publishedWeeks.length,
      dbRowCount: assignmentRows.length,
      publishedShiftCount: publishedShifts.length,
      monthShiftCount: monthShifts.length,
      utcQueryStart: rangeStart.toISOString(),
      utcQueryEnd: rangeEnd.toISOString(),
    },
  };
}

export type StaffScheduleResult = Awaited<ReturnType<typeof loadMyStaffSchedule>>;
export type StaffScheduleShift = StaffScheduleResult["days"][number]["shifts"][number];
export type StaffScheduleQueryMeta = StaffScheduleResult["meta"];

export const listMyStaffSchedule = createServerFn({ method: "GET" })
  .validator((data: ListMyStaffScheduleInput) => listMyStaffScheduleInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    return loadMyStaffSchedule(data.month, session.user.id);
  });
