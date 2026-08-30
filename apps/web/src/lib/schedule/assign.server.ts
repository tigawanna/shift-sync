import type { DbSession } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import {
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import {
  userAvailability as userAvailabilityTable,
  userAvailabilityException as userAvailabilityExceptionTable,
  userSkill,
} from "@/lib/drizzle/schema/skills-schema";
import {
  evaluateAssignmentConstraints,
  formatAssignFailure,
  type ConstraintIssue,
  type ShiftInterval,
} from "@/lib/schedule/assign-constraints";
import type { AvailabilityException, AvailabilityWindow } from "@/lib/schedule/availability";
import {
  addDaysYmd,
  formatDateInZone,
  mondayOfWeekContaining,
  zonedWallTimeToUtc,
} from "@/lib/time/zoned";
import { and, asc, count, eq, gt, gte, inArray, lt, lte, ne } from "drizzle-orm";

/** Everything the constraint engine needs about the shift being filled. */
export type AssignShiftContext = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  locationId: string;
  skillId: string;
  locationName: string;
  timezone: string;
};

export type ConstraintInputs = {
  shiftsByUser: Map<string, ShiftInterval[]>;
  weeklyByUser: Map<string, AvailabilityWindow[]>;
  exceptionsByUser: Map<string, AvailabilityException[]>;
};

/**
 * Rest checks reach a day and a half past the week, so the window is the wider of
 * the location week (padded two days) and the shift ± 36h.
 */
export function constraintWindow(startsAt: Date, endsAt: Date, timezone: string) {
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

/** Staff who hold both the required skill and a cert at this location. */
export async function loadEligibleStaff(db: DbSession, shift: AssignShiftContext) {
  return db
    .select({ id: userTable.id, name: userTable.name })
    .from(userTable)
    .innerJoin(
      userLocation,
      and(eq(userLocation.userId, userTable.id), eq(userLocation.locationId, shift.locationId)),
    )
    .innerJoin(
      userSkill,
      and(eq(userSkill.userId, userTable.id), eq(userSkill.skillId, shift.skillId)),
    )
    .orderBy(asc(userTable.name));
}

/**
 * Other assignments, weekly availability, and exceptions for each user, over the
 * window the engine needs.
 */
export async function loadConstraintInputs(
  db: DbSession,
  userIds: string[],
  shift: AssignShiftContext,
): Promise<ConstraintInputs> {
  const shiftsByUser = new Map<string, ShiftInterval[]>();
  const weeklyByUser = new Map<string, AvailabilityWindow[]>();
  const exceptionsByUser = new Map<string, AvailabilityException[]>();
  for (const userId of userIds) {
    shiftsByUser.set(userId, []);
    weeklyByUser.set(userId, []);
    exceptionsByUser.set(userId, []);
  }
  if (userIds.length === 0) {
    return { shiftsByUser, weeklyByUser, exceptionsByUser };
  }

  const window = constraintWindow(shift.startsAt, shift.endsAt, shift.timezone);
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
          ne(shiftTable.id, shift.id),
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
    exceptionsByUser.get(row.userId)?.push({
      date: row.date,
      kind: row.kind === "extra" ? "extra" : "blocked",
      startMinute: row.startMinute,
      endMinute: row.endMinute,
    });
  }

  return { shiftsByUser, weeklyByUser, exceptionsByUser };
}

/** Refuse an assignment that would push a shift past the headcount the board shows. */
export async function assertHeadcountAvailable(
  db: DbSession,
  shift: Pick<AssignShiftContext, "id">,
  headcountNeeded: number,
) {
  const [row] = await db
    .select({ filled: count() })
    .from(shiftAssignmentTable)
    .where(eq(shiftAssignmentTable.shiftId, shift.id));
  const filled = row?.filled ?? 0;
  if (filled >= headcountNeeded) {
    throw new Error(
      `This shift already has ${filled} of ${headcountNeeded} needed. Raise the headcount first.`,
    );
  }
}

export function evaluateForUser(
  shift: AssignShiftContext,
  userId: string,
  inputs: ConstraintInputs,
) {
  return evaluateAssignmentConstraints({
    candidateStartsAt: shift.startsAt,
    candidateEndsAt: shift.endsAt,
    locationTimezone: shift.timezone,
    locationName: shift.locationName,
    otherShifts: inputs.shiftsByUser.get(userId) ?? [],
    weekly: inputs.weeklyByUser.get(userId) ?? [],
    exceptions: inputs.exceptionsByUser.get(userId) ?? [],
  });
}

/** Hard rules are everything except the 7th consecutive day, which an override clears. */
function hardFailures(failures: ConstraintIssue[]) {
  return failures.filter((issue) => issue.rule !== "consecutive_days");
}

export type AssertAssignableOptions = {
  /**
   * `commit` runs inside the write transaction against one user only. `precheck`
   * also evaluates every other eligible person so the failure message can name
   * alternatives.
   */
  phase?: "precheck" | "commit";
  /** Prefix for the thrown message, e.g. `"Cannot approve: "`. */
  messagePrefix?: string;
  /** Replaces the message when the blocker is an overlap — used to report a lost race. */
  overlapMessage?: string;
};

/**
 * The single gate for putting someone on a shift: skill, cert, and every
 * scheduling rule. Assign, coverage approval, and shift edits all go through
 * this so they cannot drift apart.
 */
export async function assertAssignable(
  db: DbSession,
  input: {
    shift: AssignShiftContext;
    userId: string;
    overrideReason?: string | null;
  },
  options: AssertAssignableOptions = {},
) {
  const phase = options.phase ?? "precheck";
  const prefix = options.messagePrefix ?? "";
  const eligible = await loadEligibleStaff(db, input.shift);
  if (!eligible.some((person) => person.id === input.userId)) {
    throw new Error(
      `${prefix}Only staff with this skill and location certification can be assigned.`,
    );
  }

  const userIds = phase === "commit" ? [input.userId] : eligible.map((person) => person.id);
  const inputs = await loadConstraintInputs(db, userIds, input.shift);
  const candidate = evaluateForUser(input.shift, input.userId, inputs);

  const alternativeNames =
    phase === "commit"
      ? []
      : eligible
          .filter(
            (person) =>
              person.id !== input.userId &&
              hardFailures(evaluateForUser(input.shift, person.id, inputs).failures).length === 0,
          )
          .map((person) => person.name);

  let failures = candidate.failures;
  if (candidate.requiresOverride) {
    if (!input.overrideReason) {
      throw new Error(prefix + formatAssignFailure(failures, alternativeNames));
    }
    failures = hardFailures(failures);
  }

  const hard = hardFailures(failures);
  if (hard.length > 0) {
    if (options.overlapMessage && hard.some((issue) => issue.rule === "double_booking")) {
      throw new Error(options.overlapMessage);
    }
    throw new Error(prefix + formatAssignFailure(hard, alternativeNames));
  }

  return {
    weeklyHours: candidate.weeklyHours,
    warnings: candidate.warnings,
    otherShifts: inputs.shiftsByUser.get(input.userId) ?? [],
    alternativeNames,
  };
}

/**
 * Re-run every rule for the people already on a shift, against its new time or
 * skill. Keeps a manager from dragging a shift into someone's rest window.
 * A 7th-day assignment keeps the reason documented on the original assignment.
 */
export async function assertAssigneesStillLegal(
  db: DbSession,
  input: { shift: AssignShiftContext; userIds: string[] },
) {
  if (input.userIds.length === 0) return;

  const people = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      overrideReason: shiftAssignmentTable.overrideReason,
    })
    .from(shiftAssignmentTable)
    .innerJoin(userTable, eq(userTable.id, shiftAssignmentTable.userId))
    .where(
      and(
        eq(shiftAssignmentTable.shiftId, input.shift.id),
        inArray(shiftAssignmentTable.userId, input.userIds),
      ),
    );

  for (const person of people) {
    await assertAssignable(
      db,
      {
        shift: input.shift,
        userId: person.id,
        overrideReason: person.overrideReason ?? "carried over from the original assignment",
      },
      { phase: "commit", messagePrefix: `Cannot move this shift — ${person.name}: ` },
    );
  }
}
