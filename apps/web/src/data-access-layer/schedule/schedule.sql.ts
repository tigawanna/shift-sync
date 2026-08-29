import { getDb } from "@/lib/drizzle/client";
import { location as locationTable } from "@/lib/drizzle/schema/locations-schema";
import { scheduleWeek as scheduleWeekTable } from "@/lib/drizzle/schema/schedule-schema";
import { EDIT_CUTOFF_HOURS, MIN_REST_HOURS, DAILY_HOURS_WARN, DAILY_HOURS_BLOCK, WEEKLY_HOURS_WARN, WEEKLY_HOURS_SOFT_CAP } from "@/lib/schedule/constraints";
import { addDaysYmd, formatDateInZone, formatTimeInZone, monthGridDates, zonedWallTimeToUtc } from "@/lib/time/zoned";
import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { ConstraintFailure, ConstraintWarning } from "@/lib/schedule/constraints";
import type { ShiftAssignee, WeekShift, PersonCalendarWeekStat } from "./schedule.types";

export type LocationBound = {
  id: string;
  name: string;
  timezone: string;
  startMs: number;
  endMs: number;
};

export function weekBoundsForLocation(weekStart: string, timezone: string) {
  return rangeBoundsForLocation(weekStart, addDaysYmd(weekStart, 7), timezone);
}

export function rangeBoundsForLocation(startYmd: string, endExclusiveYmd: string, timezone: string) {
  const start = zonedWallTimeToUtc(startYmd, "00:00", timezone);
  const end = zonedWallTimeToUtc(endExclusiveYmd, "00:00", timezone);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

export async function loadLocationBounds(locationIds: string[], weekStart: string): Promise<LocationBound[]> {
  return loadLocationRangeBounds(locationIds, weekStart, addDaysYmd(weekStart, 7));
}

export async function loadLocationRangeBounds(
  locationIds: string[],
  startYmd: string,
  endExclusiveYmd: string,
): Promise<LocationBound[]> {
  if (locationIds.length === 0) return [];
  const db = await getDb();
  const rows = await db
    .select({
      id: locationTable.id,
      name: locationTable.name,
      timezone: locationTable.timezone,
    })
    .from(locationTable)
    .where(inArray(locationTable.id, locationIds));

  return rows.map((row) => {
    const bounds = rangeBoundsForLocation(startYmd, endExclusiveYmd, row.timezone);
    return { ...row, ...bounds };
  });
}

export async function loadPublishedWeekBounds(locationIds: string[]): Promise<LocationBound[]> {
  if (locationIds.length === 0) return [];
  const db = await getDb();
  const rows = await db
    .select({
      id: locationTable.id,
      name: locationTable.name,
      timezone: locationTable.timezone,
      weekStartDate: scheduleWeekTable.weekStartDate,
    })
    .from(scheduleWeekTable)
    .innerJoin(locationTable, eq(locationTable.id, scheduleWeekTable.locationId))
    .where(inArray(scheduleWeekTable.locationId, locationIds));

  return rows.map((row) => {
    const bounds = weekBoundsForLocation(row.weekStartDate, row.timezone);
    return { id: row.id, name: row.name, timezone: row.timezone, ...bounds };
  });
}

/** SQL predicate: shift overlaps the location's civil range (UTC bounds passed as parameters). */
export function shiftOverlapsLocationRangesSql(
  bounds: LocationBound[],
  table = sql`shift`,
): SQL | undefined {
  if (bounds.length === 0) return undefined;
  return or(
    ...bounds.map((bound) =>
      and(
        sql`${table}.location_id = ${bound.id}`,
        sql`${table}.starts_at < ${bound.endMs}`,
        sql`${table}.ends_at > ${bound.startMs}`,
      ),
    ),
  );
}
export function shiftInLocationWeeksSql(
  bounds: LocationBound[],
  table = sql`shift`,
): SQL | undefined {
  if (bounds.length === 0) return undefined;
  return or(
    ...bounds.map((bound) =>
      and(
        sql`${table}.location_id = ${bound.id}`,
        sql`${table}.starts_at >= ${bound.startMs}`,
        sql`${table}.starts_at < ${bound.endMs}`,
      ),
    ),
  );
}

const REST_MS = MIN_REST_HOURS * 3_600_000;

type ShiftSqlRow = {
  id: string;
  location_id: string;
  location_name: string;
  timezone: string;
  skill_id: string;
  skill_name: string;
  starts_at: number;
  ends_at: number;
  headcount_needed: number;
  notes: string | null;
  published: number;
  assignees_json: string | null;
  manager_names: string | null;
  created_by_name: string | null;
};

export type PeopleAssignmentSqlRow = ShiftSqlRow & {
  user_id: string;
  user_name: string;
  user_email: string;
  weekly_hours: number;
};

async function sqlAll<T>(query: SQL): Promise<T[]> {
  const db = await getDb();
  return (await db.all(query)) as T[];
}

function parseAssignees(raw: string | null): ShiftAssignee[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<{ userId?: string; name?: string }>;
    return parsed
      .filter((row) => row.userId && row.name)
      .map((row) => ({ userId: row.userId as string, name: row.name as string }));
  } catch {
    return [];
  }
}

export function mapShiftSqlRow(row: ShiftSqlRow, nowMs = Date.now()): WeekShift {
  const startsAt = new Date(row.starts_at);
  const endsAt = new Date(row.ends_at);
  const startDate = formatDateInZone(startsAt, row.timezone);
  const endDate = formatDateInZone(endsAt, row.timezone);
  const assignees = parseAssignees(row.assignees_json);
  const published = row.published === 1;
  const cutoffMs = nowMs + EDIT_CUTOFF_HOURS * 3_600_000;

  return {
    id: row.id,
    locationId: row.location_id,
    locationName: row.location_name,
    timezone: row.timezone,
    skillId: row.skill_id,
    skillName: row.skill_name,
    startsAt,
    endsAt,
    startDate,
    startTime: formatTimeInZone(startsAt, row.timezone),
    endDate,
    endTime: formatTimeInZone(endsAt, row.timezone),
    overnight: startDate !== endDate,
    headcountNeeded: row.headcount_needed,
    assignedCount: assignees.length,
    notes: row.notes,
    assignees,
    locked: published && row.starts_at < cutoffMs,
    managers: row.manager_names
      ? row.manager_names.split(",").map((name) => name.trim()).filter(Boolean)
      : [],
    createdByName: row.created_by_name,
  };
}

export function bucketShiftsByDay(weekStart: string, shifts: WeekShift[]) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDaysYmd(weekStart, index);
    return {
      date,
      shifts: shifts.filter((shift) => shift.startDate === date),
    };
  });
}

export async function queryWeekShiftsSql(input: {
  bounds: LocationBound[];
  weekStart: string;
  assigneeUserId?: string;
  publishedOnly?: boolean;
}): Promise<WeekShift[]> {
  if (input.bounds.length === 0) return [];

  const weekFilter = shiftInLocationWeeksSql(input.bounds);
  if (!weekFilter) return [];

  const publishedClause = input.publishedOnly
    ? sql`AND schedule_week.id IS NOT NULL`
    : sql``;
  const assigneeClause = input.assigneeUserId
    ? sql`AND EXISTS (
        SELECT 1 FROM shift_assignment mine
        WHERE mine.shift_id = shift.id AND mine.user_id = ${input.assigneeUserId}
      )`
    : sql``;

  const rows = await sqlAll<ShiftSqlRow>(sql`
    SELECT
      shift.id AS id,
      shift.location_id AS location_id,
      location.name AS location_name,
      location.timezone AS timezone,
      shift.skill_id AS skill_id,
      skill.name AS skill_name,
      shift.starts_at AS starts_at,
      shift.ends_at AS ends_at,
      shift.headcount_needed AS headcount_needed,
      shift.notes AS notes,
      CASE WHEN schedule_week.id IS NULL THEN 0 ELSE 1 END AS published,
      (
        SELECT json_group_array(json_object('userId', assignee.id, 'name', assignee.name))
        FROM shift_assignment assignment
        INNER JOIN user AS assignee ON assignee.id = assignment.user_id
        WHERE assignment.shift_id = shift.id
      ) AS assignees_json,
      (
        SELECT GROUP_CONCAT(manager.name, ', ')
        FROM user_location manager_loc
        INNER JOIN user AS manager ON manager.id = manager_loc.user_id
        WHERE manager_loc.location_id = location.id
          AND manager.role = 'manager'
      ) AS manager_names,
      (
        SELECT creator.name
        FROM user AS creator
        WHERE creator.id = shift.created_by_user_id
      ) AS created_by_name
    FROM shift
    INNER JOIN location ON location.id = shift.location_id
    INNER JOIN skill ON skill.id = shift.skill_id
    LEFT JOIN schedule_week
      ON schedule_week.location_id = shift.location_id
      AND schedule_week.week_start_date = ${input.weekStart}
    WHERE ${weekFilter}
    ${publishedClause}
    ${assigneeClause}
    ORDER BY shift.starts_at ASC
  `);

  return rows.map((row) => mapShiftSqlRow(row));
}

export async function queryUserWeekHoursSql(userId: string, bounds: LocationBound[]) {
  if (bounds.length === 0) return 0;
  const weekFilter = shiftInLocationWeeksSql(bounds);
  if (!weekFilter) return 0;

  const [row] = await sqlAll<{ hours: number }>(sql`
    SELECT COALESCE(SUM((shift.ends_at - shift.starts_at) / 3600000.0), 0) AS hours
    FROM shift_assignment
    INNER JOIN shift ON shift.id = shift_assignment.shift_id
    WHERE shift_assignment.user_id = ${userId}
      AND ${weekFilter}
  `);

  return Number(row?.hours ?? 0);
}

function sqlUnionAll(parts: SQL[]): SQL {
  return sql.join(parts, sql` UNION ALL `);
}

export function calendarWeekStarts(month: string) {
  const dates = monthGridDates(month);
  const weekStarts: string[] = [];
  for (let index = 0; index < dates.length; index += 7) {
    const weekStart = dates[index];
    if (weekStart) weekStarts.push(weekStart);
  }
  return weekStarts;
}

type RestGapSql = {
  gap_hours: number;
  previous_ends_at: number;
  next_starts_at: number;
  previous_location: string;
  next_location: string;
};

type WeekStatSqlRow = {
  week_start: string;
  hours: number;
  max_daily_hours: number;
  rest_count: number;
  rest_json: string | null;
};

function mapPersonWeekStat(row: WeekStatSqlRow): PersonCalendarWeekStat {
  const hours = Number(row.hours ?? 0);
  const maxDailyHours = Number(row.max_daily_hours ?? 0);
  const restCount = Number(row.rest_count ?? 0);
  const weeklyWarn = hours >= WEEKLY_HOURS_WARN;
  const weeklyOvertime = hours >= WEEKLY_HOURS_SOFT_CAP;
  const dailyWarn = maxDailyHours > DAILY_HOURS_WARN;
  const dailyBlock = maxDailyHours > DAILY_HOURS_BLOCK;
  const warnings: string[] = [];

  if (weeklyOvertime) {
    warnings.push(
      `This week is ${hours.toFixed(1)} scheduled hours (overtime at ${WEEKLY_HOURS_SOFT_CAP}h).`,
    );
  } else if (weeklyWarn) {
    warnings.push(
      `This week is ${hours.toFixed(1)} scheduled hours (warning at ${WEEKLY_HOURS_WARN}h+, overtime at ${WEEKLY_HOURS_SOFT_CAP}h).`,
    );
  }
  if (dailyBlock) {
    warnings.push(
      `A day this week reaches ${maxDailyHours.toFixed(1)} hours (blocked above ${DAILY_HOURS_BLOCK}h).`,
    );
  } else if (dailyWarn) {
    warnings.push(
      `A day this week reaches ${maxDailyHours.toFixed(1)} hours (warning above ${DAILY_HOURS_WARN}h).`,
    );
  }

  let restGaps: RestGapSql[] = [];
  if (row.rest_json) {
    try {
      const parsed = typeof row.rest_json === "string" ? JSON.parse(row.rest_json) : row.rest_json;
      restGaps = Array.isArray(parsed) ? (parsed as RestGapSql[]) : [];
    } catch {
      restGaps = [];
    }
  }
  for (const gap of restGaps) {
    const gapHours = Number(gap.gap_hours);
    if (gapHours < 0) {
      warnings.push(
        `Overlapping shifts at ${gap.previous_location} and ${gap.next_location} - less than ${MIN_REST_HOURS} hours rest.`,
      );
      continue;
    }
    warnings.push(
      `${gapHours.toFixed(1)} hours between ${gap.previous_location} ending and ${gap.next_location} starting (needs ${MIN_REST_HOURS} hours rest).`,
    );
  }

  return {
    weekStart: row.week_start,
    hours,
    maxDailyHours,
    weeklyWarn,
    weeklyOvertime,
    dailyWarn,
    dailyBlock,
    restCount,
    warnings,
  };
}

export async function queryPersonCalendarWeekStatsSql(input: {
  userId: string;
  locationIds: string[];
  weekStarts: string[];
  publishedOnlyBounds?: LocationBound[];
}): Promise<PersonCalendarWeekStat[]> {
  const empty = input.weekStarts.map((weekStart) =>
    mapPersonWeekStat({
      week_start: weekStart,
      hours: 0,
      max_daily_hours: 0,
      rest_count: 0,
      rest_json: null,
    }),
  );
  if (input.weekStarts.length === 0 || input.locationIds.length === 0) return empty;

  const db = await getDb();
  const locations = await db
    .select({
      id: locationTable.id,
      timezone: locationTable.timezone,
    })
    .from(locationTable)
    .where(inArray(locationTable.id, input.locationIds));
  if (locations.length === 0) return empty;

  const locWeekParts = input.weekStarts.flatMap((weekStart) =>
    locations.map((location) => {
      const bounds = weekBoundsForLocation(weekStart, location.timezone);
      return sql`SELECT ${weekStart} AS week_start, ${location.id} AS location_id, ${bounds.startMs} AS start_ms, ${bounds.endMs} AS end_ms`;
    }),
  );
  const dayParts = input.weekStarts.flatMap((weekStart) =>
    Array.from({ length: 7 }, (_, offset) => addDaysYmd(weekStart, offset)).flatMap((ymd) =>
      locations.map((location) => {
        const bounds = rangeBoundsForLocation(ymd, addDaysYmd(ymd, 1), location.timezone);
        return sql`SELECT ${weekStart} AS week_start, ${ymd} AS ymd, ${location.id} AS location_id, ${bounds.startMs} AS start_ms, ${bounds.endMs} AS end_ms`;
      }),
    ),
  );
  const weekParts = input.weekStarts.map(
    (weekStart) => sql`SELECT ${weekStart} AS week_start`,
  );

  const locStartMs = Math.min(
    ...input.weekStarts.flatMap((weekStart) =>
      locations.map((location) => weekBoundsForLocation(weekStart, location.timezone).startMs),
    ),
  );
  const locEndMs = Math.max(
    ...input.weekStarts.flatMap((weekStart) =>
      locations.map((location) => weekBoundsForLocation(weekStart, location.timezone).endMs),
    ),
  );
  const padStartMs = locStartMs - 14 * 86_400_000;

  let minePublished: SQL = sql``;
  let joinPublished: SQL = sql``;
  if (input.publishedOnlyBounds) {
    const published = shiftInLocationWeeksSql(input.publishedOnlyBounds);
    if (published) {
      minePublished = sql`AND ${published}`;
      joinPublished = sql`WHERE ${published}`;
    } else {
      minePublished = sql`AND 0`;
      joinPublished = sql`WHERE 0`;
    }
  }

  const rows = await sqlAll<WeekStatSqlRow>(sql`
    WITH loc_weeks AS (
      ${sqlUnionAll(locWeekParts)}
    ),
    day_windows AS (
      ${sqlUnionAll(dayParts)}
    ),
    weeks AS (
      ${sqlUnionAll(weekParts)}
    ),
    mine AS (
      SELECT
        shift.id AS id,
        shift.location_id AS location_id,
        location.name AS location_name,
        shift.starts_at AS starts_at,
        shift.ends_at AS ends_at
      FROM shift_assignment
      INNER JOIN shift ON shift.id = shift_assignment.shift_id
      INNER JOIN location ON location.id = shift.location_id
      WHERE shift_assignment.user_id = ${input.userId}
        AND shift.starts_at < ${locEndMs}
        AND shift.ends_at > ${padStartMs}
        ${minePublished}
    ),
    week_hours AS (
      SELECT loc_weeks.week_start AS week_start,
        COALESCE(SUM((shift.ends_at - shift.starts_at) / 3600000.0), 0) AS hours
      FROM loc_weeks
      INNER JOIN shift ON shift.location_id = loc_weeks.location_id
        AND shift.starts_at >= loc_weeks.start_ms
        AND shift.starts_at < loc_weeks.end_ms
      INNER JOIN shift_assignment ON shift_assignment.shift_id = shift.id
        AND shift_assignment.user_id = ${input.userId}
      ${joinPublished}
      GROUP BY loc_weeks.week_start
    ),
    daily AS (
      SELECT week_start, MAX(hours) AS max_daily_hours
      FROM (
        SELECT day_windows.week_start AS week_start,
          SUM((shift.ends_at - shift.starts_at) / 3600000.0) AS hours
        FROM day_windows
        INNER JOIN shift ON shift.location_id = day_windows.location_id
          AND shift.starts_at >= day_windows.start_ms
          AND shift.starts_at < day_windows.end_ms
        INNER JOIN shift_assignment ON shift_assignment.shift_id = shift.id
          AND shift_assignment.user_id = ${input.userId}
        ${joinPublished}
        GROUP BY day_windows.week_start, day_windows.ymd, day_windows.location_id
      ) AS day_totals
      GROUP BY week_start
    ),
    lagged AS (
      SELECT
        id,
        location_id,
        location_name,
        starts_at,
        ends_at,
        LAG(ends_at) OVER (ORDER BY starts_at, id) AS prev_ends_at,
        LAG(location_name) OVER (ORDER BY starts_at, id) AS prev_location
      FROM mine
    ),
    rest AS (
      SELECT loc_weeks.week_start AS week_start,
        COUNT(*) AS rest_count,
        json_group_array(
          json_object(
            'gap_hours', (lagged.starts_at - lagged.prev_ends_at) / 3600000.0,
            'previous_ends_at', lagged.prev_ends_at,
            'next_starts_at', lagged.starts_at,
            'previous_location', lagged.prev_location,
            'next_location', lagged.location_name
          )
        ) AS rest_json
      FROM lagged
      INNER JOIN loc_weeks
        ON loc_weeks.location_id = lagged.location_id
        AND lagged.starts_at >= loc_weeks.start_ms
        AND lagged.starts_at < loc_weeks.end_ms
      WHERE lagged.prev_ends_at IS NOT NULL
        AND lagged.starts_at < lagged.prev_ends_at + ${REST_MS}
      GROUP BY loc_weeks.week_start
    )
    SELECT
      weeks.week_start AS week_start,
      COALESCE(week_hours.hours, 0) AS hours,
      COALESCE(daily.max_daily_hours, 0) AS max_daily_hours,
      COALESCE(rest.rest_count, 0) AS rest_count,
      rest.rest_json AS rest_json
    FROM weeks
    LEFT JOIN week_hours ON week_hours.week_start = weeks.week_start
    LEFT JOIN daily ON daily.week_start = weeks.week_start
    LEFT JOIN rest ON rest.week_start = weeks.week_start
    ORDER BY weeks.week_start ASC
  `);

  const byWeek = new Map(rows.map((row) => [row.week_start, mapPersonWeekStat(row)]));
  return input.weekStarts.map(
    (weekStart) =>
      byWeek.get(weekStart) ??
      mapPersonWeekStat({
        week_start: weekStart,
        hours: 0,
        max_daily_hours: 0,
        rest_count: 0,
        rest_json: null,
      }),
  );
}

export type StaffSqlFlags = {
  userId: string;
  name: string;
  email: string;
  hasSkill: number;
  alreadyAssigned: number;
  overlapCount: number;
  restCount: number;
  dailyHours: number;
  weeklyHours: number;
  availabilityOk: number;
};

export async function queryStaffFlagsForShiftSql(input: {
  locationId: string;
  skillId: string;
  shiftId: string;
  startsAtMs: number;
  endsAtMs: number;
  dayStartMs: number;
  dayEndMs: number;
  weekStartMs: number;
  weekEndMs: number;
  weekdayStart: number;
  startMinute: number;
  weekdayEnd: number;
  endMinute: number;
  candidateHours: number;
}): Promise<StaffSqlFlags[]> {
  const rows = await sqlAll<StaffSqlFlags>(sql`
    SELECT
      staff.id AS userId,
      staff.name AS name,
      staff.email AS email,
      CASE WHEN user_skill.id IS NULL THEN 0 ELSE 1 END AS hasSkill,
      CASE WHEN current_assignment.id IS NULL THEN 0 ELSE 1 END AS alreadyAssigned,
      COALESCE(overlap.cnt, 0) AS overlapCount,
      COALESCE(rest.cnt, 0) AS restCount,
      COALESCE(day_hours.hours, 0) + ${input.candidateHours} AS dailyHours,
      COALESCE(week_hours.hours, 0) + ${input.candidateHours} AS weeklyHours,
      CASE
        WHEN (
          SELECT COUNT(*) FROM user_availability
          WHERE user_availability.user_id = staff.id
        ) = 0 THEN 1
        WHEN EXISTS (
          SELECT 1 FROM user_availability start_window
          WHERE start_window.user_id = staff.id
            AND start_window.weekday = ${input.weekdayStart}
            AND ${input.startMinute} >= start_window.start_minute
            AND ${input.startMinute} < start_window.end_minute
        )
        AND EXISTS (
          SELECT 1 FROM user_availability end_window
          WHERE end_window.user_id = staff.id
            AND end_window.weekday = ${input.weekdayEnd}
            AND ${Math.max(input.endMinute - 1, 0)} >= end_window.start_minute
            AND ${Math.max(input.endMinute - 1, 0)} < end_window.end_minute
        ) THEN 1
        ELSE 0
      END AS availabilityOk
    FROM user AS staff
    INNER JOIN user_location certified
      ON certified.user_id = staff.id
      AND certified.location_id = ${input.locationId}
    LEFT JOIN user_skill
      ON user_skill.user_id = staff.id
      AND user_skill.skill_id = ${input.skillId}
    LEFT JOIN shift_assignment AS current_assignment
      ON current_assignment.shift_id = ${input.shiftId}
      AND current_assignment.user_id = staff.id
    LEFT JOIN (
      SELECT assignment.user_id AS user_id, COUNT(*) AS cnt
      FROM shift_assignment AS assignment
      INNER JOIN shift ON shift.id = assignment.shift_id
      WHERE shift.id != ${input.shiftId}
        AND shift.starts_at < ${input.endsAtMs}
        AND shift.ends_at > ${input.startsAtMs}
      GROUP BY assignment.user_id
    ) AS overlap ON overlap.user_id = staff.id
    LEFT JOIN (
      SELECT assignment.user_id AS user_id, COUNT(*) AS cnt
      FROM shift_assignment AS assignment
      INNER JOIN shift ON shift.id = assignment.shift_id
      WHERE shift.id != ${input.shiftId}
        AND (
          (
            shift.ends_at <= ${input.startsAtMs}
            AND (${input.startsAtMs} - shift.ends_at) < ${REST_MS}
          )
          OR (
            shift.starts_at >= ${input.endsAtMs}
            AND (shift.starts_at - ${input.endsAtMs}) < ${REST_MS}
          )
        )
      GROUP BY assignment.user_id
    ) AS rest ON rest.user_id = staff.id
    LEFT JOIN (
      SELECT assignment.user_id AS user_id,
        SUM((shift.ends_at - shift.starts_at) / 3600000.0) AS hours
      FROM shift_assignment AS assignment
      INNER JOIN shift ON shift.id = assignment.shift_id
      WHERE shift.id != ${input.shiftId}
        AND shift.starts_at >= ${input.dayStartMs}
        AND shift.starts_at < ${input.dayEndMs}
      GROUP BY assignment.user_id
    ) AS day_hours ON day_hours.user_id = staff.id
    LEFT JOIN (
      SELECT assignment.user_id AS user_id,
        SUM((shift.ends_at - shift.starts_at) / 3600000.0) AS hours
      FROM shift_assignment AS assignment
      INNER JOIN shift ON shift.id = assignment.shift_id
      WHERE shift.id != ${input.shiftId}
        AND shift.starts_at >= ${input.weekStartMs}
        AND shift.starts_at < ${input.weekEndMs}
      GROUP BY assignment.user_id
    ) AS week_hours ON week_hours.user_id = staff.id
    WHERE staff.role = 'staff'
    ORDER BY
      CASE
        WHEN user_skill.id IS NOT NULL
          AND current_assignment.id IS NULL
          AND COALESCE(overlap.cnt, 0) = 0
          AND COALESCE(rest.cnt, 0) = 0
          AND (COALESCE(day_hours.hours, 0) + ${input.candidateHours}) <= 12
        THEN 0 ELSE 1
      END,
      staff.name ASC
  `);

  return rows;
}

export function flagsToConstraintMessages(
  flags: StaffSqlFlags,
  locationName: string,
): { failures: ConstraintFailure[]; warnings: ConstraintWarning[]; eligible: boolean } {
  const failures: ConstraintFailure[] = [];
  const warnings: ConstraintWarning[] = [];

  if (!flags.hasSkill) {
    failures.push({
      rule: "required_skill",
      message: "Does not have the skill this shift requires.",
    });
  }
  if (flags.alreadyAssigned) {
    failures.push({
      rule: "already_assigned",
      message: "Already assigned to this shift.",
    });
  }
  if (flags.overlapCount > 0) {
    failures.push({
      rule: "double_booking",
      message: `Already booked on an overlapping shift (including other locations).`,
    });
  }
  if (flags.restCount > 0) {
    failures.push({
      rule: "rest_period",
      message: `Needs ${MIN_REST_HOURS} hours rest between shifts.`,
    });
  }
  if (!flags.availabilityOk) {
    failures.push({
      rule: "availability",
      message: `This shift falls outside their stated availability (checked in ${locationName}'s timezone).`,
    });
  }
  if (flags.dailyHours > 12) {
    failures.push({
      rule: "daily_hours",
      message: `Would exceed 12 hours in a single day (${flags.dailyHours.toFixed(1)}h).`,
    });
  } else if (flags.dailyHours > 8) {
    warnings.push({
      rule: "overtime_daily",
      message: `Daily hours would be ${flags.dailyHours.toFixed(1)}h (warning above 8h).`,
    });
  }
  if (flags.weeklyHours >= 35) {
    warnings.push({
      rule: "overtime_weekly",
      message: `Weekly hours would be ${flags.weeklyHours.toFixed(1)}h (warning at 35+, overtime at 40).`,
    });
  }

  return { failures, warnings, eligible: failures.length === 0 };
}

export type FutureAssignmentSqlRow = {
  shift_id: string;
  location_name: string;
  starts_at: number;
  ends_at: number;
  hours: number;
};

export async function queryFutureAssignmentsAtLocationsSql(userId: string, locationIds: string[], nowMs: number) {
  if (locationIds.length === 0) return [];
  return sqlAll<FutureAssignmentSqlRow>(sql`
    SELECT
      shift.id AS shift_id,
      location.name AS location_name,
      shift.starts_at AS starts_at,
      shift.ends_at AS ends_at,
      (shift.ends_at - shift.starts_at) / 3600000.0 AS hours
    FROM shift_assignment
    INNER JOIN shift ON shift.id = shift_assignment.shift_id
    INNER JOIN location ON location.id = shift.location_id
    WHERE shift_assignment.user_id = ${userId}
      AND shift.location_id IN (${sql.join(
        locationIds.map((id) => sql`${id}`),
        sql`, `,
      )})
      AND shift.starts_at > ${nowMs}
    ORDER BY shift.starts_at ASC
  `);
}

export async function queryHoursAtLocationsInRangeSql(
  userId: string,
  locationIds: string[],
  startMs: number,
  endMs: number,
) {
  if (locationIds.length === 0) return 0;
  const [row] = await sqlAll<{ hours: number }>(sql`
    SELECT COALESCE(SUM((shift.ends_at - shift.starts_at) / 3600000.0), 0) AS hours
    FROM shift_assignment
    INNER JOIN shift ON shift.id = shift_assignment.shift_id
    WHERE shift_assignment.user_id = ${userId}
      AND shift.location_id IN (${sql.join(
        locationIds.map((id) => sql`${id}`),
        sql`, `,
      )})
      AND shift.starts_at >= ${startMs}
      AND shift.starts_at < ${endMs}
  `);
  return Number(row?.hours ?? 0);
}

export async function queryLockedShiftExistsSql(locationId: string, weekStart: string, cutoffMs: number) {
  const [row] = await sqlAll<{ found: number }>(sql`
    SELECT 1 AS found
    FROM shift
    INNER JOIN schedule_week
      ON schedule_week.location_id = shift.location_id
      AND schedule_week.week_start_date = ${weekStart}
    WHERE shift.location_id = ${locationId}
      AND shift.starts_at < ${cutoffMs}
    LIMIT 1
  `);
  return Boolean(row);
}

export async function queryPeopleAssignmentsSql(input: {
  bounds: LocationBound[];
  weekStart: string;
  staffIds?: string[];
}): Promise<PeopleAssignmentSqlRow[]> {
  if (input.bounds.length === 0) return [];
  const weekFilter = shiftInLocationWeeksSql(input.bounds);
  if (!weekFilter) return [];

  const staffClause =
    input.staffIds && input.staffIds.length > 0
      ? sql`AND staff.id IN (${sql.join(
          input.staffIds.map((id) => sql`${id}`),
          sql`, `,
        )})`
      : sql``;

  return sqlAll<PeopleAssignmentSqlRow>(sql`
    SELECT
      staff.id AS user_id,
      staff.name AS user_name,
      staff.email AS user_email,
      (
        SELECT COALESCE(SUM((inner_shift.ends_at - inner_shift.starts_at) / 3600000.0), 0)
        FROM shift_assignment inner_assignment
        INNER JOIN shift AS inner_shift ON inner_shift.id = inner_assignment.shift_id
        WHERE inner_assignment.user_id = staff.id
          AND ${shiftInLocationWeeksSql(input.bounds, sql`inner_shift`)}
      ) AS weekly_hours,
      shift.id AS id,
      shift.location_id AS location_id,
      location.name AS location_name,
      location.timezone AS timezone,
      shift.skill_id AS skill_id,
      skill.name AS skill_name,
      shift.starts_at AS starts_at,
      shift.ends_at AS ends_at,
      shift.headcount_needed AS headcount_needed,
      shift.notes AS notes,
      CASE WHEN schedule_week.id IS NULL THEN 0 ELSE 1 END AS published,
      json_array(json_object('userId', staff.id, 'name', staff.name)) AS assignees_json,
      (
        SELECT GROUP_CONCAT(manager.name, ', ')
        FROM user_location manager_loc
        INNER JOIN user AS manager ON manager.id = manager_loc.user_id
        WHERE manager_loc.location_id = location.id
          AND manager.role = 'manager'
      ) AS manager_names,
      (
        SELECT creator.name
        FROM user AS creator
        WHERE creator.id = shift.created_by_user_id
      ) AS created_by_name
    FROM user AS staff
    INNER JOIN shift_assignment ON shift_assignment.user_id = staff.id
    INNER JOIN shift ON shift.id = shift_assignment.shift_id
    INNER JOIN location ON location.id = shift.location_id
    INNER JOIN skill ON skill.id = shift.skill_id
    LEFT JOIN schedule_week
      ON schedule_week.location_id = shift.location_id
      AND schedule_week.week_start_date = ${input.weekStart}
    WHERE staff.role = 'staff'
      AND ${weekFilter}
      ${staffClause}
    ORDER BY staff.name ASC, shift.starts_at ASC
  `);
}

export type AssignmentInstantRow = {
  user_id: string;
  starts_at: number;
  ends_at: number;
  timezone: string;
};

export async function queryAssignmentInstantsSql(bounds: LocationBound[]) {
  const rangeFilter = shiftOverlapsLocationRangesSql(bounds);
  if (!rangeFilter) return [];

  return sqlAll<AssignmentInstantRow>(sql`
    SELECT
      assignment.user_id AS user_id,
      shift.starts_at AS starts_at,
      shift.ends_at AS ends_at,
      location.timezone AS timezone
    FROM shift_assignment AS assignment
    INNER JOIN shift ON shift.id = assignment.shift_id
    INNER JOIN location ON location.id = shift.location_id
    INNER JOIN user AS staff ON staff.id = assignment.user_id
    WHERE staff.role = 'staff'
      AND ${rangeFilter}
  `);
}

export async function queryOverlappingShiftsSql(input: {
  bounds: LocationBound[];
  assigneeUserId?: string;
  publishedOnlyBounds?: LocationBound[];
}): Promise<WeekShift[]> {
  const rangeFilter = shiftOverlapsLocationRangesSql(input.bounds);
  if (!rangeFilter) return [];

  const publishedOnly = input.publishedOnlyBounds
    ? shiftInLocationWeeksSql(input.publishedOnlyBounds)
    : undefined;
  if (input.publishedOnlyBounds && !publishedOnly) return [];

  const publishedFlag = input.publishedOnlyBounds
    ? sql`CASE WHEN ${shiftInLocationWeeksSql(input.publishedOnlyBounds)} THEN 1 ELSE 0 END`
    : sql`CASE WHEN ${shiftInLocationWeeksSql(input.bounds)} THEN 1 ELSE 0 END`;

  const assigneeClause = input.assigneeUserId
    ? sql`AND EXISTS (
        SELECT 1 FROM shift_assignment mine
        WHERE mine.shift_id = shift.id AND mine.user_id = ${input.assigneeUserId}
      )`
    : sql``;
  const publishedClause = publishedOnly ? sql`AND ${publishedOnly}` : sql``;

  const rows = await sqlAll<ShiftSqlRow>(sql`
    SELECT
      shift.id AS id,
      shift.location_id AS location_id,
      location.name AS location_name,
      location.timezone AS timezone,
      shift.skill_id AS skill_id,
      skill.name AS skill_name,
      shift.starts_at AS starts_at,
      shift.ends_at AS ends_at,
      shift.headcount_needed AS headcount_needed,
      shift.notes AS notes,
      ${publishedFlag} AS published,
      (
        SELECT json_group_array(json_object('userId', assignee.id, 'name', assignee.name))
        FROM shift_assignment assignment
        INNER JOIN user AS assignee ON assignee.id = assignment.user_id
        WHERE assignment.shift_id = shift.id
      ) AS assignees_json,
      (
        SELECT GROUP_CONCAT(manager.name, ', ')
        FROM user_location manager_loc
        INNER JOIN user AS manager ON manager.id = manager_loc.user_id
        WHERE manager_loc.location_id = location.id
          AND manager.role = 'manager'
      ) AS manager_names,
      (
        SELECT creator.name
        FROM user AS creator
        WHERE creator.id = shift.created_by_user_id
      ) AS created_by_name
    FROM shift
    INNER JOIN location ON location.id = shift.location_id
    INNER JOIN skill ON skill.id = shift.skill_id
    WHERE ${rangeFilter}
    ${publishedClause}
    ${assigneeClause}
    ORDER BY shift.starts_at ASC
  `);

  return rows.map((row) => mapShiftSqlRow(row));
}

export async function queryOverlappingPeopleSql(bounds: LocationBound[]): Promise<PeopleAssignmentSqlRow[]> {
  const rangeFilter = shiftOverlapsLocationRangesSql(bounds);
  if (!rangeFilter) return [];

  return sqlAll<PeopleAssignmentSqlRow>(sql`
    SELECT
      staff.id AS user_id,
      staff.name AS user_name,
      staff.email AS user_email,
      0 AS weekly_hours,
      shift.id AS id,
      shift.location_id AS location_id,
      location.name AS location_name,
      location.timezone AS timezone,
      shift.skill_id AS skill_id,
      skill.name AS skill_name,
      shift.starts_at AS starts_at,
      shift.ends_at AS ends_at,
      shift.headcount_needed AS headcount_needed,
      shift.notes AS notes,
      0 AS published,
      json_array(json_object('userId', staff.id, 'name', staff.name)) AS assignees_json,
      (
        SELECT GROUP_CONCAT(manager.name, ', ')
        FROM user_location manager_loc
        INNER JOIN user AS manager ON manager.id = manager_loc.user_id
        WHERE manager_loc.location_id = location.id
          AND manager.role = 'manager'
      ) AS manager_names,
      (
        SELECT creator.name
        FROM user AS creator
        WHERE creator.id = shift.created_by_user_id
      ) AS created_by_name
    FROM user AS staff
    INNER JOIN shift_assignment ON shift_assignment.user_id = staff.id
    INNER JOIN shift ON shift.id = shift_assignment.shift_id
    INNER JOIN location ON location.id = shift.location_id
    INNER JOIN skill ON skill.id = shift.skill_id
    WHERE staff.role = 'staff'
      AND ${rangeFilter}
    ORDER BY location.name ASC, staff.name ASC, shift.starts_at ASC
  `);
}
