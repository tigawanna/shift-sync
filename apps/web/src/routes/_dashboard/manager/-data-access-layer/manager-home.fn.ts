import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import {
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import { skill as skillTable } from "@/lib/drizzle/schema/skills-schema";
import { formatDateInZone, formatTimeInZone, mondayOfWeekContaining } from "@/lib/time/zoned";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, countDistinct, eq, gt, inArray, lte } from "drizzle-orm";
import { loadMyManagerLocations } from "./manager-locations.server";

export const MANAGER_ON_DUTY_PREVIEW = 3;

export const loadManagerHome = createServerFn({ method: "GET" }).handler(async () => {
  const { session } = await requireSessionRoles([ROLE.manager]);
  const locations = await loadMyManagerLocations(session.user.id);
  const locationIds = locations.map((location) => location.id);
  const empty = {
    staffCount: 0,
    locationCount: 0,
    overseeingCount: 0,
    onDutyTotal: 0,
    onDuty: [] as Array<{
      assignmentId: string;
      userId: string;
      userName: string;
      locationId: string;
      locationName: string;
      skillName: string;
      date: string;
      startTime: string;
      endTime: string;
      weekStart: string;
    }>,
  };

  if (locationIds.length === 0) return empty;

  const now = new Date();
  const db = await getDb();
  const onDutyWhere = and(
    lte(shiftTable.startsAt, now),
    gt(shiftTable.endsAt, now),
    inArray(shiftTable.locationId, locationIds),
  );

  const [staffRow, overseeingRow, onDutyTotalRow, onDutyRows] = await Promise.all([
    db
      .select({ total: countDistinct(userTable.id) })
      .from(userTable)
      .innerJoin(userLocation, eq(userLocation.userId, userTable.id))
      .where(and(eq(userTable.role, ROLE.staff), inArray(userLocation.locationId, locationIds))),
    db
      .select({ total: count() })
      .from(shiftAssignmentTable)
      .innerJoin(shiftTable, eq(shiftTable.id, shiftAssignmentTable.shiftId))
      .where(and(inArray(shiftTable.locationId, locationIds), gt(shiftTable.endsAt, now))),
    db
      .select({ total: count() })
      .from(shiftAssignmentTable)
      .innerJoin(shiftTable, eq(shiftTable.id, shiftAssignmentTable.shiftId))
      .where(onDutyWhere),
    db
      .select({
        assignmentId: shiftAssignmentTable.id,
        userId: userTable.id,
        userName: userTable.name,
        locationId: locationTable.id,
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
      .where(onDutyWhere)
      .orderBy(asc(locationTable.name), asc(shiftTable.startsAt), asc(userTable.name))
      .limit(MANAGER_ON_DUTY_PREVIEW),
  ]);

  return {
    staffCount: staffRow[0]?.total ?? 0,
    locationCount: locations.length,
    overseeingCount: overseeingRow[0]?.total ?? 0,
    onDutyTotal: onDutyTotalRow[0]?.total ?? 0,
    onDuty: onDutyRows.map((row) => ({
      assignmentId: row.assignmentId,
      userId: row.userId,
      userName: row.userName,
      locationId: row.locationId,
      locationName: row.locationName,
      skillName: row.skillName,
      date: formatDateInZone(row.startsAt, row.timezone),
      startTime: formatTimeInZone(row.startsAt, row.timezone),
      endTime: formatTimeInZone(row.endsAt, row.timezone),
      weekStart: mondayOfWeekContaining(row.startsAt, row.timezone),
    })),
  };
});
