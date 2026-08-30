import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { isPremiumStart } from "@/lib/schedule/labor";
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
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { assertManagerLocationAccess, loadMyManagerLocations } from "./manager-locations.server";

export const EDIT_CUTOFF_HOURS = 48;

const weekStartSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Week must be YYYY-MM-DD");

export const managerWeekInputSchema = z.object({
  locationId: z.string().min(1),
  weekStart: weekStartSchema,
});

export type ManagerWeekInput = z.infer<typeof managerWeekInputSchema>;

export function cutoffInstant() {
  return new Date(Date.now() + EDIT_CUTOFF_HOURS * 3_600_000);
}

export function snapToMonday(weekStart: string, timezone: string) {
  return mondayOfWeekContaining(zonedWallTimeToUtc(weekStart, "12:00", timezone), timezone);
}

/** Shifts belong to the week of their location-local start, not by overlap. */
export function weekStartUtcRange(weekStart: string, timezone: string) {
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
      skillId: true,
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
    skillId: row.skillId,
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
    premium: isPremiumStart(row.startsAt, timezone),
  };
}

export type ManagerWeekSchedule = Awaited<ReturnType<typeof loadWeekSchedule>>;
export type ManagerWeekShift = ManagerWeekSchedule["days"][number]["shifts"][number];

export const listManagerSchedulesInputSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional(),
  locationId: z.string().optional(),
});

export type ListManagerSchedulesInput = z.infer<typeof listManagerSchedulesInputSchema>;

async function loadManagerScheduleList(userId: string, input: ListManagerSchedulesInput) {
  const page = input.page;
  const perPage = input.perPage;
  const locations = await loadMyManagerLocations(userId);
  const scoped = input.locationId
    ? locations.filter((location) => location.id === input.locationId)
    : locations;

  if (scoped.length === 0) {
    return { items: [], total: 0, page, perPage, totalPages: 1 };
  }

  const locationIds = scoped.map((location) => location.id);
  const locationById = new Map(scoped.map((location) => [location.id, location]));
  const db = await getDb();
  const cutoff = cutoffInstant();

  const [shiftRows, publications] = await Promise.all([
    db
      .select({
        id: shiftTable.id,
        locationId: shiftTable.locationId,
        startsAt: shiftTable.startsAt,
      })
      .from(shiftTable)
      .where(inArray(shiftTable.locationId, locationIds)),
    db
      .select({
        locationId: scheduleWeekTable.locationId,
        weekStartDate: scheduleWeekTable.weekStartDate,
      })
      .from(scheduleWeekTable)
      .where(inArray(scheduleWeekTable.locationId, locationIds)),
  ]);

  // Week key is location + Monday in that location's zone; SQLite cannot group that.
  const weeks = new Map<
    string,
    { locationId: string; weekStart: string; shiftCount: number; lockedCount: number }
  >();

  for (const row of shiftRows) {
    const location = locationById.get(row.locationId);
    if (!location) continue;
    const weekStart = mondayOfWeekContaining(row.startsAt, location.timezone);
    const key = `${location.id}:${weekStart}`;
    const current = weeks.get(key) ?? {
      locationId: location.id,
      weekStart,
      shiftCount: 0,
      lockedCount: 0,
    };
    current.shiftCount += 1;
    if (row.startsAt.getTime() < cutoff.getTime()) current.lockedCount += 1;
    weeks.set(key, current);
  }

  for (const publication of publications) {
    const key = `${publication.locationId}:${publication.weekStartDate}`;
    if (weeks.has(key) || !locationById.has(publication.locationId)) continue;
    weeks.set(key, {
      locationId: publication.locationId,
      weekStart: publication.weekStartDate,
      shiftCount: 0,
      lockedCount: 0,
    });
  }

  const publishedKeys = new Set(
    publications.map((row) => `${row.locationId}:${row.weekStartDate}`),
  );
  const query = input.sq?.trim().toLowerCase() ?? "";

  const allItems = [...weeks.values()]
    .map((week) => {
      const location = locationById.get(week.locationId);
      if (!location) return null;
      const published = publishedKeys.has(`${week.locationId}:${week.weekStart}`);
      return {
        locationId: location.id,
        locationName: location.name,
        timezone: location.timezone,
        weekStart: week.weekStart,
        weekEnd: addDaysYmd(week.weekStart, 6),
        published,
        shiftCount: week.shiftCount,
        canUnpublish: published && week.lockedCount === 0,
        canDelete: week.lockedCount === 0,
      };
    })
    .filter((item) => item !== null)
    .filter((item) => {
      if (!query) return true;
      const status = item.published ? "published" : "draft";
      return (
        item.locationName.toLowerCase().includes(query) ||
        item.weekStart.includes(query) ||
        item.weekEnd.includes(query) ||
        status.includes(query)
      );
    })
    .sort((left, right) => {
      const byWeek = right.weekStart.localeCompare(left.weekStart);
      if (byWeek !== 0) return byWeek;
      return left.locationName.localeCompare(right.locationName);
    });

  const total = allItems.length;
  const offset = (page - 1) * perPage;

  return {
    items: allItems.slice(offset, offset + perPage),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export const listManagerSchedules = createServerFn({ method: "GET" })
  .validator(listManagerSchedulesInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    return loadManagerScheduleList(session.user.id, data);
  });

export type ManagerScheduleList = Awaited<ReturnType<typeof loadManagerScheduleList>>;
export type ManagerScheduleListItem = ManagerScheduleList["items"][number];

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

export const deleteManagerWeek = createServerFn({ method: "POST" })
  .validator(managerWeekInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const week = await loadWeekSchedule(session.user.id, data.locationId, data.weekStart);

    if (week.lockedShiftCount > 0) {
      throw new Error(
        `Cannot delete: at least one shift in this week is inside the ${EDIT_CUTOFF_HOURS}-hour cutoff.`,
      );
    }

    const { rangeStart, rangeEnd } = weekStartUtcRange(week.weekStart, week.location.timezone);
    const db = await getDb();

    await db
      .delete(shiftTable)
      .where(
        and(
          eq(shiftTable.locationId, week.location.id),
          gte(shiftTable.startsAt, rangeStart),
          lt(shiftTable.startsAt, rangeEnd),
        ),
      );

    await db
      .delete(scheduleWeekTable)
      .where(
        and(
          eq(scheduleWeekTable.locationId, week.location.id),
          eq(scheduleWeekTable.weekStartDate, week.weekStart),
        ),
      );

    return { locationId: week.location.id, weekStart: week.weekStart };
  });
