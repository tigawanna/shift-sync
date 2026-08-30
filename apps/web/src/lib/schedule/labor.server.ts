import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { location as locationTable } from "@/lib/drizzle/schema/locations-schema";
import {
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import { staffDesiredHours } from "@/lib/drizzle/schema/staff-preferences-schema";
import { clipWeeklyHours } from "@/lib/schedule/assign-constraints";
import {
  isPremiumStart,
  overtimeCostUsd,
  overtimeHours,
  premiumFairnessScore,
} from "@/lib/schedule/labor";
import { addDaysYmd, zonedWallTimeToUtc } from "@/lib/time/zoned";
import { and, eq, gt, gte, inArray, lt } from "drizzle-orm";

export async function loadLaborReport(locationId: string, weekStart: string) {
  const db = await getDb();
  const [location] = await db
    .select({
      id: locationTable.id,
      name: locationTable.name,
      timezone: locationTable.timezone,
    })
    .from(locationTable)
    .where(eq(locationTable.id, locationId))
    .limit(1);

  if (!location) throw new Error("Location not found.");

  const rangeStart = zonedWallTimeToUtc(weekStart, "00:00", location.timezone);
  const rangeEnd = zonedWallTimeToUtc(addDaysYmd(weekStart, 7), "00:00", location.timezone);

  const locationRows = await db
    .select({
      userId: userTable.id,
      userName: userTable.name,
      shiftId: shiftTable.id,
      startsAt: shiftTable.startsAt,
      endsAt: shiftTable.endsAt,
    })
    .from(shiftAssignmentTable)
    .innerJoin(shiftTable, eq(shiftTable.id, shiftAssignmentTable.shiftId))
    .innerJoin(userTable, eq(userTable.id, shiftAssignmentTable.userId))
    .where(
      and(
        eq(shiftTable.locationId, location.id),
        gte(shiftTable.startsAt, rangeStart),
        lt(shiftTable.startsAt, rangeEnd),
      ),
    );

  const userIds = [...new Set(locationRows.map((row) => row.userId))];
  const empty = {
    locationName: location.name,
    weekStart,
    overtimeCostUsd: 0,
    fairnessScore: 100,
    premiumShiftCount: 0,
    people: [] as Array<{
      userId: string;
      name: string;
      weekHours: number;
      overtimeHours: number;
      overtimeCostUsd: number;
      desiredHours: number | null;
      hoursVsDesired: number | null;
      premiumCount: number;
      pushingOvertime: boolean;
    }>,
  };

  if (userIds.length === 0) return empty;

  const [weekRows, desiredRows] = await Promise.all([
    db
      .select({
        userId: shiftAssignmentTable.userId,
        startsAt: shiftTable.startsAt,
        endsAt: shiftTable.endsAt,
      })
      .from(shiftAssignmentTable)
      .innerJoin(shiftTable, eq(shiftTable.id, shiftAssignmentTable.shiftId))
      .where(
        and(
          inArray(shiftAssignmentTable.userId, userIds),
          lt(shiftTable.startsAt, rangeEnd),
          gt(shiftTable.endsAt, rangeStart),
        ),
      ),
    db
      .select({
        userId: staffDesiredHours.userId,
        hours: staffDesiredHours.hours,
      })
      .from(staffDesiredHours)
      .where(
        and(
          inArray(staffDesiredHours.userId, userIds),
          eq(staffDesiredHours.weekStartDate, weekStart),
        ),
      ),
  ]);

  const desiredByUser = new Map(desiredRows.map((row) => [row.userId, row.hours]));
  const weekIntervals = new Map<string, Array<{ startsAt: Date; endsAt: Date }>>();
  for (const row of weekRows) {
    const list = weekIntervals.get(row.userId) ?? [];
    list.push({ startsAt: row.startsAt, endsAt: row.endsAt });
    weekIntervals.set(row.userId, list);
  }

  const peopleById = new Map<string, (typeof empty.people)[number]>();
  for (const row of locationRows) {
    const existing = peopleById.get(row.userId);
    const premium = isPremiumStart(row.startsAt, location.timezone);
    if (existing) {
      if (premium) existing.premiumCount += 1;
      continue;
    }

    const weekHours = clipWeeklyHours(
      weekIntervals.get(row.userId) ?? [],
      weekStart,
      location.timezone,
    );
    const otHours = overtimeHours(weekHours);
    const desiredHours = desiredByUser.get(row.userId) ?? null;
    peopleById.set(row.userId, {
      userId: row.userId,
      name: row.userName,
      weekHours,
      overtimeHours: otHours,
      overtimeCostUsd: overtimeCostUsd(weekHours),
      desiredHours,
      hoursVsDesired: desiredHours === null ? null : weekHours - desiredHours,
      premiumCount: premium ? 1 : 0,
      pushingOvertime: otHours > 0,
    });
  }

  const people = [...peopleById.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const overtimeCost = people.reduce((sum, person) => sum + person.overtimeCostUsd, 0);
  const premiumShiftCount = people.reduce((sum, person) => sum + person.premiumCount, 0);

  return {
    locationName: location.name,
    weekStart,
    overtimeCostUsd: overtimeCost,
    fairnessScore: premiumFairnessScore(people.map((person) => person.premiumCount)),
    premiumShiftCount,
    people,
  };
}
