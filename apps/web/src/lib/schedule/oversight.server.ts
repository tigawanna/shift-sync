import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { location as locationTable } from "@/lib/drizzle/schema/locations-schema";
import {
  scheduleWeek as scheduleWeekTable,
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import { skill as skillTable } from "@/lib/drizzle/schema/skills-schema";
import type { OnDutyNowResult } from "@/lib/schedule/oversight";
import {
  addDaysYmd,
  formatDateInZone,
  formatTimeInZone,
  zonedWallTimeToUtc,
} from "@/lib/time/zoned";
import { and, asc, count, eq, gt, inArray, like, lte, lt, or, type SQL } from "drizzle-orm";

function locationWeekWindow(weekStart: string, timezone: string) {
  return {
    rangeStart: zonedWallTimeToUtc(weekStart, "00:00", timezone),
    rangeEnd: zonedWallTimeToUtc(addDaysYmd(weekStart, 7), "00:00", timezone),
  };
}

async function loadLocations(locationIds?: string[]) {
  const db = await getDb();
  if (locationIds && locationIds.length === 0) return [];
  return db
    .select({
      id: locationTable.id,
      name: locationTable.name,
      timezone: locationTable.timezone,
    })
    .from(locationTable)
    .where(locationIds ? inArray(locationTable.id, locationIds) : undefined)
    .orderBy(asc(locationTable.name));
}

function overlappingWeekWhere(
  locations: Array<{ id: string; timezone: string }>,
  weekStart: string,
) {
  const clauses = locations.map((location) => {
    const window = locationWeekWindow(weekStart, location.timezone);
    return and(
      eq(shiftTable.locationId, location.id),
      lt(shiftTable.startsAt, window.rangeEnd),
      gt(shiftTable.endsAt, window.rangeStart),
    );
  });
  if (clauses.length === 0) return undefined;
  return or(...clauses);
}

export async function loadOnDutyNow(locationIds?: string[]): Promise<OnDutyNowResult> {
  const locations = await loadLocations(locationIds);
  if (locations.length === 0) return { items: [], asOf: new Date().toISOString() };

  const now = new Date();
  const db = await getDb();
  const rows = await db
    .select({
      assignmentId: shiftAssignmentTable.id,
      userName: userTable.name,
      locationName: locationTable.name,
      timezone: locationTable.timezone,
      skillName: skillTable.name,
      startsAt: shiftTable.startsAt,
      endsAt: shiftTable.endsAt,
    })
    .from(shiftAssignmentTable)
    .innerJoin(shiftTable, eq(shiftTable.id, shiftAssignmentTable.shiftId))
    .innerJoin(locationTable, eq(locationTable.id, shiftTable.locationId))
    .innerJoin(skillTable, eq(skillTable.id, shiftTable.skillId))
    .innerJoin(userTable, eq(userTable.id, shiftAssignmentTable.userId))
    .where(
      and(
        lte(shiftTable.startsAt, now),
        gt(shiftTable.endsAt, now),
        inArray(
          shiftTable.locationId,
          locations.map((location) => location.id),
        ),
      ),
    )
    .orderBy(asc(locationTable.name), asc(shiftTable.startsAt), asc(userTable.name));

  return {
    asOf: now.toISOString(),
    items: rows.map((row) => ({
      assignmentId: row.assignmentId,
      userName: row.userName,
      locationName: row.locationName,
      skillName: row.skillName,
      date: formatDateInZone(row.startsAt, row.timezone),
      startTime: formatTimeInZone(row.startsAt, row.timezone),
      endTime: formatTimeInZone(row.endsAt, row.timezone),
    })),
  };
}

export async function loadOnDutyNowPage(input: {
  page: number;
  perPage: number;
  sq: string;
  locationId?: string;
}) {
  const locations = await loadLocations(input.locationId ? [input.locationId] : undefined);
  const asOf = new Date().toISOString();
  if (locations.length === 0) {
    return { items: [], total: 0, page: input.page, perPage: input.perPage, totalPages: 1, asOf };
  }

  const now = new Date();
  const trimmed = input.sq.trim();
  const pattern = `%${trimmed}%`;
  const search: SQL | undefined = trimmed
    ? or(
        like(userTable.name, pattern),
        like(locationTable.name, pattern),
        like(skillTable.name, pattern),
      )
    : undefined;
  const where = and(
    lte(shiftTable.startsAt, now),
    gt(shiftTable.endsAt, now),
    inArray(
      shiftTable.locationId,
      locations.map((location) => location.id),
    ),
    search,
  );
  const offset = (input.page - 1) * input.perPage;
  const db = await getDb();

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        assignmentId: shiftAssignmentTable.id,
        userName: userTable.name,
        locationName: locationTable.name,
        timezone: locationTable.timezone,
        skillName: skillTable.name,
        startsAt: shiftTable.startsAt,
        endsAt: shiftTable.endsAt,
      })
      .from(shiftAssignmentTable)
      .innerJoin(shiftTable, eq(shiftTable.id, shiftAssignmentTable.shiftId))
      .innerJoin(locationTable, eq(locationTable.id, shiftTable.locationId))
      .innerJoin(skillTable, eq(skillTable.id, shiftTable.skillId))
      .innerJoin(userTable, eq(userTable.id, shiftAssignmentTable.userId))
      .where(where)
      .orderBy(asc(locationTable.name), asc(shiftTable.startsAt), asc(userTable.name))
      .limit(input.perPage)
      .offset(offset),
    db
      .select({ total: count() })
      .from(shiftAssignmentTable)
      .innerJoin(shiftTable, eq(shiftTable.id, shiftAssignmentTable.shiftId))
      .innerJoin(locationTable, eq(locationTable.id, shiftTable.locationId))
      .innerJoin(skillTable, eq(skillTable.id, shiftTable.skillId))
      .innerJoin(userTable, eq(userTable.id, shiftAssignmentTable.userId))
      .where(where),
  ]);

  const total = totalRow[0]?.total ?? 0;
  return {
    asOf,
    items: rows.map((row) => ({
      assignmentId: row.assignmentId,
      userName: row.userName,
      locationName: row.locationName,
      skillName: row.skillName,
      date: formatDateInZone(row.startsAt, row.timezone),
      startTime: formatTimeInZone(row.startsAt, row.timezone),
      endTime: formatTimeInZone(row.endsAt, row.timezone),
    })),
    total,
    page: input.page,
    perPage: input.perPage,
    totalPages: Math.max(1, Math.ceil(total / input.perPage)),
  };
}

export async function loadLocationWeekSummaries(weekStart: string) {
  const locations = await loadLocations();
  const db = await getDb();
  const overlap = overlappingWeekWhere(locations, weekStart);

  const [publishedRows, countRows] = await Promise.all([
    db
      .select({
        locationId: scheduleWeekTable.locationId,
      })
      .from(scheduleWeekTable)
      .where(eq(scheduleWeekTable.weekStartDate, weekStart)),
    overlap
      ? db
          .select({
            locationId: shiftTable.locationId,
            total: count(),
          })
          .from(shiftAssignmentTable)
          .innerJoin(shiftTable, eq(shiftTable.id, shiftAssignmentTable.shiftId))
          .where(overlap)
          .groupBy(shiftTable.locationId)
      : Promise.resolve([] as Array<{ locationId: string; total: number }>),
  ]);

  const published = new Set(publishedRows.map((row) => row.locationId));
  const counts = new Map(countRows.map((row) => [row.locationId, row.total]));

  return locations.map((location) => ({
    id: location.id,
    name: location.name,
    timezone: location.timezone,
    published: published.has(location.id),
    assignmentCount: counts.get(location.id) ?? 0,
  }));
}

export async function loadWhoWorksWhere(input: {
  weekStart: string;
  page: number;
  perPage: number;
  sq: string;
  locationId?: string;
}) {
  const locations = await loadLocations(input.locationId ? [input.locationId] : undefined);
  const overlap = overlappingWeekWhere(locations, input.weekStart);
  if (!overlap) {
    return { items: [], total: 0, page: input.page, perPage: input.perPage, totalPages: 1 };
  }

  const trimmed = input.sq.trim();
  const pattern = `%${trimmed}%`;
  const search: SQL | undefined = trimmed
    ? or(
        like(userTable.name, pattern),
        like(locationTable.name, pattern),
        like(skillTable.name, pattern),
      )
    : undefined;
  const where = and(overlap, search);
  const offset = (input.page - 1) * input.perPage;
  const db = await getDb();

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        assignmentId: shiftAssignmentTable.id,
        userName: userTable.name,
        locationName: locationTable.name,
        timezone: locationTable.timezone,
        skillName: skillTable.name,
        startsAt: shiftTable.startsAt,
        endsAt: shiftTable.endsAt,
      })
      .from(shiftAssignmentTable)
      .innerJoin(shiftTable, eq(shiftTable.id, shiftAssignmentTable.shiftId))
      .innerJoin(locationTable, eq(locationTable.id, shiftTable.locationId))
      .innerJoin(skillTable, eq(skillTable.id, shiftTable.skillId))
      .innerJoin(userTable, eq(userTable.id, shiftAssignmentTable.userId))
      .where(where)
      .orderBy(asc(locationTable.name), asc(shiftTable.startsAt), asc(userTable.name))
      .limit(input.perPage)
      .offset(offset),
    db
      .select({ total: count() })
      .from(shiftAssignmentTable)
      .innerJoin(shiftTable, eq(shiftTable.id, shiftAssignmentTable.shiftId))
      .innerJoin(locationTable, eq(locationTable.id, shiftTable.locationId))
      .innerJoin(skillTable, eq(skillTable.id, shiftTable.skillId))
      .innerJoin(userTable, eq(userTable.id, shiftAssignmentTable.userId))
      .where(where),
  ]);

  const total = totalRow[0]?.total ?? 0;
  return {
    items: rows.map((row) => ({
      assignmentId: row.assignmentId,
      userName: row.userName,
      locationName: row.locationName,
      skillName: row.skillName,
      date: formatDateInZone(row.startsAt, row.timezone),
      startTime: formatTimeInZone(row.startsAt, row.timezone),
      endTime: formatTimeInZone(row.endsAt, row.timezone),
    })),
    total,
    page: input.page,
    perPage: input.perPage,
    totalPages: Math.max(1, Math.ceil(total / input.perPage)),
  };
}
