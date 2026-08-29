import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import { eq } from "drizzle-orm";
import {
  loadLocationBounds,
  queryFutureAssignmentsAtLocationsSql,
  queryUserWeekHoursSql,
} from "./schedule.sql";
import type { LocationMovePreview } from "./schedule.types";

/** Location IDs the viewer may assign: all restaurants, or only theirs. */
async function managedLocationIds(viewerId: string, role: string) {
  const db = await getDb();
  if (role === ROLE.admin) {
    const rows = await db.select({ id: locationTable.id }).from(locationTable);
    return rows.map((row) => row.id);
  }

  const rows = await db
    .select({ id: userLocation.locationId })
    .from(userLocation)
    .where(eq(userLocation.userId, viewerId));
  return rows.map((row) => row.id);
}

/** Whether dropping locations would leave this person on future shifts there. */
export async function computeLocationMovePreview(input: {
  viewerId: string;
  role: string;
  userId: string;
  locationIds: string[];
  weekStart: string;
}): Promise<LocationMovePreview> {
  const db = await getDb();
  const current = await db
    .select({ locationId: userLocation.locationId })
    .from(userLocation)
    .where(eq(userLocation.userId, input.userId));

  const currentIds = current.map((row) => row.locationId);
  const nextIds = [...new Set(input.locationIds)];
  const removedIds = currentIds.filter((id) => !nextIds.includes(id));

  if (input.role === ROLE.manager) {
    const managedIds = new Set(await managedLocationIds(input.viewerId, input.role));
    const unauthorized = nextIds.filter((id) => !managedIds.has(id) && !currentIds.includes(id));
    if (unauthorized.length > 0) {
      throw new Error("You can only assign staff to locations you manage.");
    }
  }

  const nowMs = Date.now();
  const blocking = await queryFutureAssignmentsAtLocationsSql(input.userId, removedIds, nowMs);
  const keptBounds = await loadLocationBounds(nextIds, input.weekStart);
  const weeklyHoursAfter = await queryUserWeekHoursSql(input.userId, keptBounds);

  const warnings: string[] = [];
  if (weeklyHoursAfter >= 35) {
    warnings.push(
      `After this change they still have ${weeklyHoursAfter.toFixed(1)} scheduled hours this week at the remaining locations.`,
    );
  }
  if (weeklyHoursAfter >= 40) {
    warnings.push("That remaining load is at or above 40 hours.");
  }

  return {
    canSave: blocking.length === 0,
    weeklyHoursAfter,
    blockingShifts: blocking.map((row) => ({
      shiftId: row.shift_id,
      locationName: row.location_name,
      startsAt: new Date(row.starts_at),
      hours: Number(row.hours),
    })),
    warnings,
  };
}
