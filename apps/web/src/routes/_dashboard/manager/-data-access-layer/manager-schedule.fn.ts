import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import {
  scheduleWeek as scheduleWeekTable,
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import { skill as skillTable } from "@/lib/drizzle/schema/skills-schema";
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
import { and, asc, eq, gt, inArray, lt } from "drizzle-orm";
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

function weekUtcRange(weekStart: string, timezone: string) {
  const weekEnd = addDaysYmd(weekStart, 7);
  return {
    rangeStart: zonedWallTimeToUtc(addDaysYmd(weekStart, -1), "00:00", timezone),
    rangeEnd: zonedWallTimeToUtc(addDaysYmd(weekEnd, 1), "00:00", timezone),
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

async function loadWeekSchedule(userId: string, locationId: string, requestedWeek: string) {
  const location = await assertManagerLocationAccess(userId, locationId);
  const weekStart = snapToMonday(requestedWeek, location.timezone);
  const weekDates = eachYmdInclusive(weekStart, addDaysYmd(weekStart, 6));
  const { rangeStart, rangeEnd } = weekUtcRange(weekStart, location.timezone);
  const db = await getDb();

  const [publication, shiftRows] = await Promise.all([
    loadPublication(db, location.id, weekStart),
    db
      .select({
        shift: shiftTable,
        skillName: skillTable.name,
      })
      .from(shiftTable)
      .innerJoin(skillTable, eq(shiftTable.skillId, skillTable.id))
      .where(
        and(
          eq(shiftTable.locationId, location.id),
          lt(shiftTable.startsAt, rangeEnd),
          gt(shiftTable.endsAt, rangeStart),
        ),
      )
      .orderBy(asc(shiftTable.startsAt)),
  ]);

  const weekShifts = shiftRows.filter(
    (row) => mondayOfWeekContaining(row.shift.startsAt, location.timezone) === weekStart,
  );

  const shiftIds = weekShifts.map((row) => row.shift.id);
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
          .where(inArray(shiftAssignmentTable.shiftId, shiftIds))
          .orderBy(asc(userTable.name));

  const assigneesByShift = new Map<string, Array<Pick<typeof userTable.$inferSelect, "id" | "name">>>();
  for (const row of assignmentRows) {
    const list = assigneesByShift.get(row.shiftId) ?? [];
    list.push({ id: row.userId, name: row.name });
    assigneesByShift.set(row.shiftId, list);
  }

  const mapped = weekShifts.map((row) => {
    const startsAt = row.shift.startsAt;
    const endsAt = row.shift.endsAt;
    const startDate = formatDateInZone(startsAt, location.timezone);
    const endDate = formatDateInZone(endsAt, location.timezone);
    return {
      id: row.shift.id,
      skillName: row.skillName,
      startsAt,
      endsAt,
      startDate,
      endDate,
      startTime: formatTimeInZone(startsAt, location.timezone),
      endTime: formatTimeInZone(endsAt, location.timezone),
      overnight: startDate !== endDate,
      hours: (endsAt.getTime() - startsAt.getTime()) / 3_600_000,
      headcountNeeded: row.shift.headcountNeeded,
      notes: row.shift.notes,
      assignees: assigneesByShift.get(row.shift.id) ?? [],
      locked: startsAt.getTime() < cutoffInstant().getTime(),
    };
  });

  const published = Boolean(publication);
  const lockedShiftCount = mapped.filter((shift) => shift.locked).length;

  return {
    location,
    weekStart,
    weekEnd: addDaysYmd(weekStart, 6),
    published,
    publishedAt: publication?.publishedAt ?? null,
    canUnpublish: published && lockedShiftCount === 0,
    lockedShiftCount,
    cutoffHours: EDIT_CUTOFF_HOURS,
    days: weekDates.map((date) => ({
      date,
      weekday: formatWeekdayYmd(date),
      label: formatDayLabel(date),
      shifts: mapped.filter((shift) => shift.startDate === date),
    })),
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
