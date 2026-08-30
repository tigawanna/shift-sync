import { getDb } from "@/lib/drizzle/client";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import {
  scheduleWeek as scheduleWeekTable,
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import { skill as skillTable } from "@/lib/drizzle/schema/skills-schema";
import { hoursByLocalDate } from "@/lib/schedule/assign-constraints";
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
import { and, asc, count, eq, gt, lt } from "drizzle-orm";

function monthUtcOverlapRange(month: string) {
  const monthStart = monthStartYmd(month);
  const monthEndExclusive = monthStartYmd(addMonthsYm(month, 1));

  return {
    rangeStart: zonedWallTimeToUtc(addDaysYmd(monthStart, -8), "00:00", "UTC"),
    rangeEnd: zonedWallTimeToUtc(addDaysYmd(monthEndExclusive, 8), "00:00", "UTC"),
  };
}

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
    .innerJoin(
      userLocation,
      and(eq(userLocation.userId, userId), eq(userLocation.locationId, shiftTable.locationId)),
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

export async function loadStaffScheduleForUser(
  month: string,
  userId: string,
  options: { publishedOnly?: boolean } = {},
) {
  const publishedOnly = options.publishedOnly ?? true;
  const db = await getDb();
  const { rangeStart, rangeEnd } = monthUtcOverlapRange(month);

  const [assignmentRows, publishedWeeks, certifiedLocationCount] = await Promise.all([
    selectMyAssignments(db, userId, month),
    selectMyPublishedWeeks(db, userId),
    db
      .select({ total: count() })
      .from(userLocation)
      .where(eq(userLocation.userId, userId))
      .then((rows) => rows[0]?.total ?? 0),
  ]);

  const publishedWeekKeys = new Set(
    publishedWeeks.map((week) => `${week.locationId}:${week.weekStartDate}`),
  );

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

  const visibleShifts = publishedOnly ? mapped.filter((shift) => shift.published) : mapped;
  const hoursByDate: Record<string, number> = {};
  for (const shift of visibleShifts) {
    for (const [ymd, hours] of hoursByLocalDate(shift.startsAt, shift.endsAt, shift.timezone)) {
      hoursByDate[ymd] = (hoursByDate[ymd] ?? 0) + hours;
    }
  }
  const monthShifts = visibleShifts.filter((shift) => yearMonthOf(shift.startDate) === month);
  const days = [...new Set(monthShifts.map((shift) => shift.startDate))].sort().map((date) => ({
    date,
    label: formatDayLabel(date),
    shifts: monthShifts.filter((shift) => shift.startDate === date),
  }));

  return {
    month,
    monthLabel: formatMonthLabel(month),
    monthlyHours: monthShifts.reduce((total, shift) => total + shift.hours, 0),
    hoursByDate,
    days,
    meta: {
      locationCount: certifiedLocationCount,
      publishedWeekCount: publishedWeeks.length,
      dbRowCount: assignmentRows.length,
      publishedShiftCount: mapped.filter((shift) => shift.published).length,
      monthShiftCount: monthShifts.length,
      utcQueryStart: rangeStart.toISOString(),
      utcQueryEnd: rangeEnd.toISOString(),
    },
  };
}

export type StaffScheduleResult = Awaited<ReturnType<typeof loadStaffScheduleForUser>>;
export type StaffScheduleShift = StaffScheduleResult["days"][number]["shifts"][number];
export type StaffScheduleQueryMeta = StaffScheduleResult["meta"];
