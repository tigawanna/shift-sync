import type { AppDatabase } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { userLocation } from "@/lib/drizzle/schema/locations-schema";
import { appNotification, notificationPreference } from "@/lib/drizzle/schema/notification-schema";
import { ROLE } from "@/lib/better-auth/roles";
import { and, eq, inArray, like } from "drizzle-orm";

export async function notifyUsers(
  db: Pick<AppDatabase, "insert" | "select">,
  userIds: string[],
  message: { kind: string; title: string; body: string },
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;

  const prefs = await db
    .select({
      userId: notificationPreference.userId,
      emailSimulation: notificationPreference.emailSimulation,
    })
    .from(notificationPreference)
    .where(inArray(notificationPreference.userId, unique));
  const emailByUser = new Map(prefs.map((row) => [row.userId, row.emailSimulation]));

  await db.insert(appNotification).values(
    unique.map((userId) => ({
      id: crypto.randomUUID(),
      userId,
      kind: message.kind,
      title: message.title,
      body: message.body,
      emailSimulated: emailByUser.get(userId) === true,
    })),
  );
}

export async function loadLocationManagerIds(db: Pick<AppDatabase, "select">, locationId: string) {
  const rows = await db
    .select({ id: userTable.id })
    .from(userTable)
    .innerJoin(userLocation, eq(userLocation.userId, userTable.id))
    .where(and(eq(userLocation.locationId, locationId), like(userTable.role, `%${ROLE.manager}%`)));
  return rows.map((row) => row.id);
}
