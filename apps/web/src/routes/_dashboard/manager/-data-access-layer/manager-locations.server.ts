import { getDb } from "@/lib/drizzle/client";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import { asc, eq } from "drizzle-orm";

export type ManagerLocation = typeof locationTable.$inferSelect;

export async function loadMyManagerLocations(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ location: locationTable })
    .from(locationTable)
    .innerJoin(userLocation, eq(userLocation.locationId, locationTable.id))
    .where(eq(userLocation.userId, userId))
    .orderBy(asc(locationTable.name));

  return rows.map((row) => row.location);
}

export async function assertManagerLocationAccess(userId: string, locationId: string) {
  const locations = await loadMyManagerLocations(userId);
  const location = locations.find((item) => item.id === locationId);
  if (!location) {
    throw new Error("You do not manage this location.");
  }
  return location;
}
