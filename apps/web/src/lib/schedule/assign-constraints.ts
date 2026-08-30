import {
  isAvailableAt,
  type AvailabilityException,
  type AvailabilityWindow,
} from "@/lib/schedule/availability";
import {
  addDaysYmd,
  formatDateInZone,
  minutesFromMidnight,
  mondayOfWeekContaining,
  weekdayInZone,
  zonedWallTimeToUtc,
} from "@/lib/time/zoned";

export const MIN_REST_HOURS = 10;
export const DAILY_HOURS_WARN = 8;
export const DAILY_HOURS_BLOCK = 12;
export const WEEKLY_HOURS_WARN = 35;
export const WEEKLY_HOURS_LIMIT = 40;

export type ShiftInterval = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  locationName?: string;
};

export type ConstraintIssue = {
  rule: string;
  message: string;
};

function hoursBetween(later: Date, earlier: Date) {
  return (later.getTime() - earlier.getTime()) / 3_600_000;
}

function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

/** Split an interval onto civil dates in `timeZone` (overnight counts on both days). */
export function hoursByLocalDate(startsAt: Date, endsAt: Date, timeZone: string) {
  const hours = new Map<string, number>();
  let cursor = startsAt.getTime();
  const end = endsAt.getTime();
  while (cursor < end) {
    const instant = new Date(cursor);
    const ymd = formatDateInZone(instant, timeZone);
    const nextMidnight = zonedWallTimeToUtc(addDaysYmd(ymd, 1), "00:00", timeZone).getTime();
    const sliceEnd = Math.min(end, nextMidnight);
    hours.set(ymd, (hours.get(ymd) ?? 0) + (sliceEnd - cursor) / 3_600_000);
    cursor = sliceEnd;
  }
  return hours;
}

/** Hours of the given intervals that fall inside the Mon–Sun week of `weekStart` in `timeZone`. */
export function clipWeeklyHours(
  intervals: Array<{ startsAt: Date; endsAt: Date }>,
  weekStart: string,
  timeZone: string,
) {
  const rangeStart = zonedWallTimeToUtc(weekStart, "00:00", timeZone).getTime();
  const rangeEnd = zonedWallTimeToUtc(addDaysYmd(weekStart, 7), "00:00", timeZone).getTime();
  let weeklyHours = 0;
  for (const interval of intervals) {
    const overlapStart = Math.max(interval.startsAt.getTime(), rangeStart);
    const overlapEnd = Math.min(interval.endsAt.getTime(), rangeEnd);
    if (overlapEnd > overlapStart) weeklyHours += (overlapEnd - overlapStart) / 3_600_000;
  }
  return weeklyHours;
}

function mergeHours(into: Map<string, number>, add: Map<string, number>) {
  for (const [ymd, hours] of add) {
    into.set(ymd, (into.get(ymd) ?? 0) + hours);
  }
}

function isFullyCoveredByAvailability(input: {
  candidateStartsAt: Date;
  candidateEndsAt: Date;
  locationTimezone: string;
  weekly: AvailabilityWindow[];
  exceptions: AvailabilityException[];
}) {
  let cursor = input.candidateStartsAt.getTime();
  const end = input.candidateEndsAt.getTime();
  while (cursor < end) {
    const instant = new Date(cursor);
    if (
      !isAvailableAt({
        weekday: weekdayInZone(instant, input.locationTimezone),
        ymd: formatDateInZone(instant, input.locationTimezone),
        minute: minutesFromMidnight(instant, input.locationTimezone),
        weekly: input.weekly,
        exceptions: input.exceptions,
      })
    ) {
      return false;
    }
    cursor += 60_000;
  }
  return true;
}

/** Distinct civil dates in the location week that have any assigned time. A 1h shift counts as a day. */
function workedDatesInWeek(
  candidateStartsAt: Date,
  candidateEndsAt: Date,
  otherShifts: ShiftInterval[],
  timeZone: string,
) {
  const weekStart = mondayOfWeekContaining(candidateStartsAt, timeZone);
  const weekEnd = addDaysYmd(weekStart, 7);
  const rangeStart = zonedWallTimeToUtc(weekStart, "00:00", timeZone);
  const rangeEnd = zonedWallTimeToUtc(weekEnd, "00:00", timeZone);
  const dates = new Set<string>();

  function addInterval(startsAt: Date, endsAt: Date) {
    if (endsAt.getTime() <= rangeStart.getTime() || startsAt.getTime() >= rangeEnd.getTime()) {
      return;
    }
    const clippedStart = new Date(Math.max(startsAt.getTime(), rangeStart.getTime()));
    const clippedEnd = new Date(Math.min(endsAt.getTime(), rangeEnd.getTime()));
    for (const ymd of hoursByLocalDate(clippedStart, clippedEnd, timeZone).keys()) {
      if (ymd >= weekStart && ymd < weekEnd) dates.add(ymd);
    }
  }

  addInterval(candidateStartsAt, candidateEndsAt);
  for (const other of otherShifts) addInterval(other.startsAt, other.endsAt);
  return { weekStart, dates };
}

function longestConsecutiveDays(weekStart: string, dates: Set<string>) {
  let longest = 0;
  let run = 0;
  for (let i = 0; i < 7; i += 1) {
    const ymd = addDaysYmd(weekStart, i);
    if (dates.has(ymd)) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  return longest;
}

export function evaluateAssignmentConstraints(input: {
  candidateStartsAt: Date;
  candidateEndsAt: Date;
  locationTimezone: string;
  locationName: string;
  otherShifts: ShiftInterval[];
  weekly: AvailabilityWindow[];
  exceptions: AvailabilityException[];
}): {
  failures: ConstraintIssue[];
  warnings: ConstraintIssue[];
  requiresOverride: boolean;
  weeklyHours: number;
} {
  const failures: ConstraintIssue[] = [];
  const warnings: ConstraintIssue[] = [];

  for (const other of input.otherShifts) {
    if (
      intervalsOverlap(input.candidateStartsAt, input.candidateEndsAt, other.startsAt, other.endsAt)
    ) {
      const where = other.locationName ? ` at ${other.locationName}` : "";
      failures.push({
        rule: "double_booking",
        message: `Double-booking: already assigned${where} during this time.`,
      });
      break;
    }
  }

  for (const other of input.otherShifts) {
    if (
      intervalsOverlap(input.candidateStartsAt, input.candidateEndsAt, other.startsAt, other.endsAt)
    ) {
      continue;
    }

    if (other.endsAt.getTime() <= input.candidateStartsAt.getTime()) {
      const gap = hoursBetween(input.candidateStartsAt, other.endsAt);
      if (gap < MIN_REST_HOURS) {
        failures.push({
          rule: "rest_period",
          message: `Rest: only ${gap.toFixed(1)}h after the previous shift (need ${MIN_REST_HOURS}h).`,
        });
        break;
      }
    }

    if (other.startsAt.getTime() >= input.candidateEndsAt.getTime()) {
      const gap = hoursBetween(other.startsAt, input.candidateEndsAt);
      if (gap < MIN_REST_HOURS) {
        failures.push({
          rule: "rest_period",
          message: `Rest: only ${gap.toFixed(1)}h before the next shift (need ${MIN_REST_HOURS}h).`,
        });
        break;
      }
    }
  }

  if (
    !isFullyCoveredByAvailability({
      candidateStartsAt: input.candidateStartsAt,
      candidateEndsAt: input.candidateEndsAt,
      locationTimezone: input.locationTimezone,
      weekly: input.weekly,
      exceptions: input.exceptions,
    })
  ) {
    failures.push({
      rule: "availability",
      message: "Availability: this shift is outside their windows (location timezone).",
    });
  }

  const dailyHours = hoursByLocalDate(
    input.candidateStartsAt,
    input.candidateEndsAt,
    input.locationTimezone,
  );
  for (const other of input.otherShifts) {
    mergeHours(dailyHours, hoursByLocalDate(other.startsAt, other.endsAt, input.locationTimezone));
  }

  const candidateDates = [
    ...hoursByLocalDate(
      input.candidateStartsAt,
      input.candidateEndsAt,
      input.locationTimezone,
    ).keys(),
  ];
  for (const ymd of candidateDates) {
    const hours = dailyHours.get(ymd) ?? 0;
    if (hours > DAILY_HOURS_BLOCK) {
      failures.push({
        rule: "daily_hours",
        message: `Daily hours: ${hours.toFixed(1)}h on ${ymd} (hard block over ${DAILY_HOURS_BLOCK}h).`,
      });
    } else if (hours > DAILY_HOURS_WARN) {
      warnings.push({
        rule: "daily_hours",
        message: `Daily hours: ${hours.toFixed(1)}h on ${ymd} (warning over ${DAILY_HOURS_WARN}h).`,
      });
    }
  }

  const weekStart = mondayOfWeekContaining(input.candidateStartsAt, input.locationTimezone);
  const weeklyHours = clipWeeklyHours(
    [{ startsAt: input.candidateStartsAt, endsAt: input.candidateEndsAt }, ...input.otherShifts],
    weekStart,
    input.locationTimezone,
  );

  if (weeklyHours >= WEEKLY_HOURS_LIMIT) {
    warnings.push({
      rule: "weekly_hours",
      message: `Weekly hours: ${weeklyHours.toFixed(1)}h (over the ${WEEKLY_HOURS_LIMIT}h limit).`,
    });
  } else if (weeklyHours >= WEEKLY_HOURS_WARN) {
    warnings.push({
      rule: "weekly_hours",
      message: `Weekly hours: ${weeklyHours.toFixed(1)}h (warning at ${WEEKLY_HOURS_WARN}+).`,
    });
  }

  const { dates } = workedDatesInWeek(
    input.candidateStartsAt,
    input.candidateEndsAt,
    input.otherShifts,
    input.locationTimezone,
  );
  const streak = longestConsecutiveDays(weekStart, dates);
  let requiresOverride = false;
  if (streak >= 7) {
    requiresOverride = true;
    failures.push({
      rule: "consecutive_days",
      message:
        "Consecutive days: this is their 7th day in the week. Document a reason to override.",
    });
  } else if (streak >= 6) {
    warnings.push({
      rule: "consecutive_days",
      message: "Consecutive days: this is their 6th day in the week.",
    });
  }

  return { failures, warnings, requiresOverride, weeklyHours };
}

export function formatAssignFailure(failures: ConstraintIssue[], alternativeNames: string[]) {
  const why = failures.map((issue) => issue.message).join(" ");
  if (alternativeNames.length === 0) {
    return `${why} No other qualified staff clear these rules.`;
  }
  return `${why} Alternatives: ${alternativeNames.join(", ")}.`;
}
