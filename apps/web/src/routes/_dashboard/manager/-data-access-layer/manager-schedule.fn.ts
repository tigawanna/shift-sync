import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import {
  scheduleWeek as scheduleWeekTable,
  shift as shiftTable,
} from "@/lib/drizzle/schema/schedule-schema";
import {
  addDaysYmd,
  eachYmdInclusive,
  formatDateInZone,
  formatDayLabel,
  formatTimeInZone,
  formatWeekdayYmd,
  mondayOfWeekContaining,
  zonedWallTimeToUtc,
} from "@/lib/time/zoned";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { assertManagerLocationAccess } from "./manager-locations.fn";

export const EDIT_CUTOFF_HOURS = 48;

const weekStartSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Week must be YYYY-MM-DD");

export const managerWeekInputSchema = z.object({
  locationId: z.string().min(1),
  weekStart: weekStartSchema,
});

export type ManagerWeekInput = z.infer<typeof managerWeekInputSchema>;

function cutoffInstant() {
  return new Date(Date.now() + EDIT_CUTOFF_HOURS * 3_600_000);
}

function snapToMonday(weekStart: string, timezone: string) {
  return mondayOfWeekContaining(zonedWallTimeToUtc(weekStart, "12:00", timezone), timezone);
}

/** Shifts belong to the week of their location-local start, not by overlap. */
function weekStartUtcRange(weekStart: string, timezone: string) {
  return {
    rangeStart: zonedWallTimeToUtc(weekStart, "00:00", timezone),
    rangeEnd: zonedWallTimeToUtc(addDaysYmd(weekStart, 7), "00:00", timezone),
  };
}

async function loadPublication(
  db: Awaited<ReturnType<typeof getDb>>,
  locationId: string,
  weekStart: string,
) {
  const [row] = await db
    .select({
      publishedAt: scheduleWeekTable.publishedAt,
      publishedByUserId: scheduleWeekTable.publishedByUserId,
    })
    .from(scheduleWeekTable)
    .where(
      and(
        eq(scheduleWeekTable.locationId, locationId),
        eq(scheduleWeekTable.weekStartDate, weekStart),
      ),
    )
    .limit(1);

  return row ?? null;
}

function selectWeekShifts(
  db: Awaited<ReturnType<typeof getDb>>,
  locationId: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  return db.query.shift.findMany({
    columns: {
      id: true,
      startsAt: true,
      endsAt: true,
      headcountNeeded: true,
      notes: true,
    },
    where: and(
      eq(shiftTable.locationId, locationId),
      gte(shiftTable.startsAt, rangeStart),
      lt(shiftTable.startsAt, rangeEnd),
    ),
    orderBy: [asc(shiftTable.startsAt)],
    with: {
      skill: { columns: { name: true } },
      assignments: {
        columns: {},
        with: {
          user: { columns: { id: true, name: true } },
        },
      },
    },
  });
}

async function loadWeekSchedule(userId: string, locationId: string, requestedWeek: string) {
  const location = await assertManagerLocationAccess(userId, locationId);
  const weekStart = snapToMonday(requestedWeek, location.timezone);
  const weekDates = eachYmdInclusive(weekStart, addDaysYmd(weekStart, 6));
  const { rangeStart, rangeEnd } = weekStartUtcRange(weekStart, location.timezone);
  const cutoff = cutoffInstant();
  const db = await getDb();

  const [publication, weekShifts] = await Promise.all([
    loadPublication(db, location.id, weekStart),
    selectWeekShifts(db, location.id, rangeStart, rangeEnd),
  ]);

  // Empty Mon–Sun columns so days with no shifts still render.
  const days = weekDates.map((date) => ({
    date,
    weekday: formatWeekdayYmd(date),
    label: formatDayLabel(date),
    shifts: [] as ReturnType<typeof toBoardShift>[],
  }));
  const dayByDate = new Map(days.map((day) => [day.date, day]));
  let lockedShiftCount = 0;

  // Civil times in the location zone; bucket by local start; tally cutoff locks.
  for (const row of weekShifts) {
    const shift = toBoardShift(row, location.timezone, cutoff);
    if (shift.locked) lockedShiftCount += 1;
    dayByDate.get(shift.startDate)?.shifts.push(shift);
  }

  const published = Boolean(publication);

  return {
    location,
    weekStart,
    weekEnd: addDaysYmd(weekStart, 6),
    published,
    publishedAt: publication?.publishedAt ?? null,
    canUnpublish: published && lockedShiftCount === 0,
    lockedShiftCount,
    cutoffHours: EDIT_CUTOFF_HOURS,
    days,
  };
}

function toBoardShift(
  row: Awaited<ReturnType<typeof selectWeekShifts>>[number],
  timezone: string,
  cutoff: Date,
) {
  const startDate = formatDateInZone(row.startsAt, timezone);
  const endDate = formatDateInZone(row.endsAt, timezone);
  return {
    id: row.id,
    skillName: row.skill.name,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    startDate,
    endDate,
    startTime: formatTimeInZone(row.startsAt, timezone),
    endTime: formatTimeInZone(row.endsAt, timezone),
    overnight: startDate !== endDate,
    hours: (row.endsAt.getTime() - row.startsAt.getTime()) / 3_600_000,
    headcountNeeded: row.headcountNeeded,
    notes: row.notes,
    assignees: row.assignments
      .map((assignment) => assignment.user)
      .sort((left, right) => left.name.localeCompare(right.name)),
    locked: row.startsAt.getTime() < cutoff.getTime(),
  };
}

export type ManagerWeekSchedule = Awaited<ReturnType<typeof loadWeekSchedule>>;
export type ManagerWeekShift = ManagerWeekSchedule["days"][number]["shifts"][number];

export const getManagerWeekSchedule = createServerFn({ method: "GET" })
  .validator(managerWeekInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    return loadWeekSchedule(session.user.id, data.locationId, data.weekStart);
  });

export const publishManagerWeek = createServerFn({ method: "POST" })
  .validator(managerWeekInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const location = await assertManagerLocationAccess(session.user.id, data.locationId);
    const weekStart = snapToMonday(data.weekStart, location.timezone);
    const db = await getDb();
    const existing = await loadPublication(db, location.id, weekStart);

    if (!existing) {
      await db.insert(scheduleWeekTable).values({
        id: crypto.randomUUID(),
        locationId: location.id,
        weekStartDate: weekStart,
        publishedAt: new Date(),
        publishedByUserId: session.user.id,
      });
    }

    return loadWeekSchedule(session.user.id, location.id, weekStart);
  });

export const unpublishManagerWeek = createServerFn({ method: "POST" })
  .validator(managerWeekInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const week = await loadWeekSchedule(session.user.id, data.locationId, data.weekStart);

    if (!week.published) {
      return week;
    }

    if (!week.canUnpublish) {
      throw new Error(
        `Cannot unpublish: at least one shift in this week is inside the ${EDIT_CUTOFF_HOURS}-hour cutoff.`,
      );
    }

    const db = await getDb();
    await db
      .delete(scheduleWeekTable)
      .where(
        and(
          eq(scheduleWeekTable.locationId, week.location.id),
          eq(scheduleWeekTable.weekStartDate, week.weekStart),
        ),
      );

    return loadWeekSchedule(session.user.id, week.location.id, week.weekStart);
  });
