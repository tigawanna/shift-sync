import { getEnv } from "../src/env";
import { ROLE } from "../src/lib/better-auth/roles";
import { getDb } from "../src/lib/drizzle/client";
import { user as userTable } from "../src/lib/drizzle/schema/auth-schema";
import { location as locationTable, userLocation } from "../src/lib/drizzle/schema/locations-schema";
import { createAuthFromEnv } from "../src/server/create-auth";
import { eq } from "drizzle-orm";
import { SEED_LOCATIONS, SEED_USER_LOCATIONS } from "./seed/locations.data";
import { SEED_DEFAULT_PASSWORD, SEED_USERS } from "./seed/users.data";

async function ensureSeedUser(
  auth: Awaited<ReturnType<typeof createAuthFromEnv>>,
  db: Awaited<ReturnType<typeof getDb>>,
  seed: { name: string; email: string; role: typeof ROLE.admin | typeof ROLE.manager | typeof ROLE.staff },
) {
  const existing = await db
    .select({ id: userTable.id, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.email, seed.email))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].role !== seed.role) {
      await db.update(userTable).set({ role: seed.role }).where(eq(userTable.id, existing[0].id));
      console.log(`updated role: ${seed.email} → ${seed.role}`);
    } else {
      console.log(`skip (exists): ${seed.email}`);
    }
    return existing[0].id;
  }

  await auth.api.signUpEmail({
    body: {
      name: seed.name,
      email: seed.email,
      password: SEED_DEFAULT_PASSWORD,
    },
  });

  if (seed.role !== ROLE.staff) {
    await db.update(userTable).set({ role: seed.role }).where(eq(userTable.email, seed.email));
  }

  const [created] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, seed.email))
    .limit(1);

  console.log(`created: ${seed.email} (${seed.role})`);
  return created?.id;
}

async function ensureSeedLocation(
  db: Awaited<ReturnType<typeof getDb>>,
  seed: (typeof SEED_LOCATIONS)[number],
) {
  const existing = await db
    .select({ id: locationTable.id })
    .from(locationTable)
    .where(eq(locationTable.id, seed.id))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(locationTable)
      .set({ name: seed.name, timezone: seed.timezone, address: seed.address })
      .where(eq(locationTable.id, seed.id));
    console.log(`updated location: ${seed.name}`);
    return;
  }

  await db.insert(locationTable).values({
    id: seed.id,
    name: seed.name,
    timezone: seed.timezone,
    address: seed.address,
  });
  console.log(`created location: ${seed.name}`);
}

async function ensureUserLocationAssignment(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
  locationId: string,
) {
  const rows = await db
    .select({ id: userLocation.id, locationId: userLocation.locationId })
    .from(userLocation)
    .where(eq(userLocation.userId, userId));

  if (rows.some((row) => row.locationId === locationId)) {
    return;
  }

  await db.insert(userLocation).values({
    id: crypto.randomUUID(),
    userId,
    locationId,
  });
}

async function main() {
  const env = getEnv();
  const db = await getDb();
  const auth = createAuthFromEnv(env, db);

  console.log(`Seeding ${SEED_USERS.length} Coastal Eats accounts…`);
  console.log(`Default password: ${SEED_DEFAULT_PASSWORD}`);
  console.log("");

  const userIds = new Map<string, string>();

  for (const seedUser of SEED_USERS) {
    const userId = await ensureSeedUser(auth, db, seedUser);
    if (userId) {
      userIds.set(seedUser.email, userId);
    }
  }

  console.log("");
  console.log(`Seeding ${SEED_LOCATIONS.length} locations…`);

  for (const seedLocation of SEED_LOCATIONS) {
    await ensureSeedLocation(db, seedLocation);
  }

  console.log("");
  console.log("Linking users to locations…");

  for (const [email, locationIds] of Object.entries(SEED_USER_LOCATIONS)) {
    const userId = userIds.get(email);
    if (!userId) {
      console.warn(`skip assignments (no user): ${email}`);
      continue;
    }

    for (const locationId of locationIds) {
      await ensureUserLocationAssignment(db, userId, locationId);
    }
    console.log(`linked: ${email} → ${locationIds.join(", ")}`);
  }

  console.log("");
  console.log("Done. Sign in at /auth with any seeded email.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
