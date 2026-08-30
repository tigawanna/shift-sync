import { getDb } from "@/lib/drizzle/client";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema";
import { eq, inArray } from "drizzle-orm";

export async function assertLocationIdsExist(locationIds: string[]) {
  const unique = [...new Set(locationIds)];
  if (unique.length === 0) return unique;

  const db = await getDb();
  const found = await db
    .select({ id: locationTable.id })
    .from(locationTable)
    .where(inArray(locationTable.id, unique));
  if (found.length !== unique.length) {
    throw new Error("One or more locations were not found.");
  }
  return unique;
}

export async function replaceUserLocations(userId: string, locationIds: string[]) {
  const unique = await assertLocationIdsExist(locationIds);
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(userLocation).where(eq(userLocation.userId, userId));
    if (unique.length === 0) return;
    await tx.insert(userLocation).values(
      unique.map((locationId) => ({
        id: crypto.randomUUID(),
        userId,
        locationId,
      })),
    );
  });
}

export async function listUserLocationIds(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ locationId: userLocation.locationId })
    .from(userLocation)
    .where(eq(userLocation.userId, userId));
  return rows.map((row) => row.locationId);
}
