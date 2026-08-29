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
export const EDIT_CUTOFF_HOURS = 48;
export const DAILY_HOURS_WARN = 8;
export const DAILY_HOURS_BLOCK = 12;
export const WEEKLY_HOURS_WARN = 35;
export const WEEKLY_HOURS_SOFT_CAP = 40;

export type ConstraintRule =
  | "location_certification"
  | "required_skill"
  | "already_assigned"
  | "double_booking"
  | "rest_period"
  | "availability"
  | "daily_hours";

export type ShiftInterval = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  locationName?: string;
};

export type { AvailabilityWindow, AvailabilityException };

export type ConstraintFailure = {
  rule: ConstraintRule;
  message: string;
};

export type ConstraintWarning = {
  rule: "overtime_daily" | "overtime_weekly";
  message: string;
};

function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

function hoursBetween(later: Date, earlier: Date) {
  return (later.getTime() - earlier.getTime()) / 3_600_000;
}

function durationHours(startsAt: Date, endsAt: Date) {
  return (endsAt.getTime() - startsAt.getTime()) / 3_600_000;
}

export function isPastEditCutoff(startsAt: Date, now = new Date()) {
  return now.getTime() > startsAt.getTime() - EDIT_CUTOFF_HOURS * 3_600_000;
}

export function evaluateAssignmentConstraints(input: {
  locationCertified: boolean;
  hasRequiredSkill: boolean;
  alreadyAssigned: boolean;
  candidateStartsAt: Date;
  candidateEndsAt: Date;
  locationTimezone: string;
  locationName: string;
  otherShifts: ShiftInterval[];
  availability: AvailabilityWindow[];
  exceptions?: AvailabilityException[];
}): { failures: ConstraintFailure[]; warnings: ConstraintWarning[] } {
  const failures: ConstraintFailure[] = [];
  const warnings: ConstraintWarning[] = [];

  if (!input.locationCertified) {
    failures.push({
      rule: "location_certification",
      message: `Not certified to work at ${input.locationName}.`,
    });
  }

  if (!input.hasRequiredSkill) {
    failures.push({
      rule: "required_skill",
      message: "Does not have the skill this shift requires.",
    });
  }

  if (input.alreadyAssigned) {
    failures.push({
      rule: "already_assigned",
      message: "Already assigned to this shift.",
    });
  }

  for (const other of input.otherShifts) {
    if (
      intervalsOverlap(input.candidateStartsAt, input.candidateEndsAt, other.startsAt, other.endsAt)
    ) {
      const where = other.locationName ? ` at ${other.locationName}` : "";
      failures.push({
        rule: "double_booking",
        message: `Already booked on an overlapping shift${where}.`,
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
          message: `Needs ${MIN_REST_HOURS} hours rest after the previous shift (${gap.toFixed(1)}h gap).`,
        });
        break;
      }
    }

    if (other.startsAt.getTime() >= input.candidateEndsAt.getTime()) {
      const gap = hoursBetween(other.startsAt, input.candidateEndsAt);
      if (gap < MIN_REST_HOURS) {
        failures.push({
          rule: "rest_period",
          message: `Needs ${MIN_REST_HOURS} hours rest before the next shift (${gap.toFixed(1)}h gap).`,
        });
        break;
      }
    }
  }

  if (input.availability.length > 0 || (input.exceptions?.length ?? 0) > 0) {
    if (!isFullyCoveredByAvailability(input)) {
      failures.push({
        rule: "availability",
        message:
          "This shift falls outside their stated availability (checked in the location timezone).",
      });
    }
  }

  const dailyHours = hoursOnLocalDate(
    input.candidateStartsAt,
    input.candidateEndsAt,
    input.otherShifts,
    input.locationTimezone,
  );

  if (dailyHours > DAILY_HOURS_BLOCK) {
    failures.push({
      rule: "daily_hours",
      message: `Would exceed ${DAILY_HOURS_BLOCK} hours in a single day (${dailyHours.toFixed(1)}h).`,
    });
  } else if (dailyHours > DAILY_HOURS_WARN) {
    warnings.push({
      rule: "overtime_daily",
      message: `Daily hours would be ${dailyHours.toFixed(1)}h (warning above ${DAILY_HOURS_WARN}h).`,
    });
  }

  const weeklyHours = hoursInLocationWeek(
    input.candidateStartsAt,
    input.candidateEndsAt,
    input.otherShifts,
    input.locationTimezone,
  );

  if (weeklyHours >= WEEKLY_HOURS_WARN) {
    warnings.push({
      rule: "overtime_weekly",
      message: `Weekly hours would be ${weeklyHours.toFixed(1)}h (warning at ${WEEKLY_HOURS_WARN}+, overtime at ${WEEKLY_HOURS_SOFT_CAP}).`,
    });
  }

  return { failures, warnings };
}

function isFullyCoveredByAvailability(input: {
  candidateStartsAt: Date;
  candidateEndsAt: Date;
  locationTimezone: string;
  availability: AvailabilityWindow[];
  exceptions?: AvailabilityException[];
}) {
  const exceptions = input.exceptions ?? [];
  let cursor = input.candidateStartsAt;
  while (cursor.getTime() < input.candidateEndsAt.getTime()) {
    const weekday = weekdayInZone(cursor, input.locationTimezone);
    const minute = minutesFromMidnight(cursor, input.locationTimezone);
    const ymd = formatDateInZone(cursor, input.locationTimezone);
    if (
      !isAvailableAt({
        weekday,
        ymd,
        minute,
        weekly: input.availability,
        exceptions,
      })
    ) {
      return false;
    }

    const next = Math.min(cursor.getTime() + 60_000, input.candidateEndsAt.getTime());
    cursor = new Date(next <= cursor.getTime() ? cursor.getTime() + 60_000 : next);
  }
  return true;
}

function hoursOnLocalDate(
  candidateStartsAt: Date,
  candidateEndsAt: Date,
  otherShifts: ShiftInterval[],
  timeZone: string,
) {
  const localDate = formatDateInZone(candidateStartsAt, timeZone);
  let hours = durationHours(candidateStartsAt, candidateEndsAt);

  for (const other of otherShifts) {
    if (formatDateInZone(other.startsAt, timeZone) === localDate) {
      hours += durationHours(other.startsAt, other.endsAt);
    }
  }

  return hours;
}

function hoursInLocationWeek(
  candidateStartsAt: Date,
  candidateEndsAt: Date,
  otherShifts: ShiftInterval[],
  timeZone: string,
) {
  const weekStart = mondayOfWeekContaining(candidateStartsAt, timeZone);
  const weekEnd = addDaysYmd(weekStart, 7);
  const rangeStart = zonedWallTimeToUtc(weekStart, "00:00", timeZone);
  const rangeEnd = zonedWallTimeToUtc(weekEnd, "00:00", timeZone);

  let hours = durationHours(candidateStartsAt, candidateEndsAt);
  for (const other of otherShifts) {
    if (other.startsAt >= rangeStart && other.startsAt < rangeEnd) {
      hours += durationHours(other.startsAt, other.endsAt);
    }
  }
  return hours;
}
