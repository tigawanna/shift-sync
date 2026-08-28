import { getEnv } from "../src/env";
import { ROLE } from "../src/lib/better-auth/roles";
import { getDb } from "../src/lib/drizzle/client";
import { user as userTable } from "../src/lib/drizzle/schema/auth-schema";
import { createAuthFromEnv } from "../src/server/create-auth";
import { eq } from "drizzle-orm";
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
    return;
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

  console.log(`created: ${seed.email} (${seed.role})`);
}

async function main() {
  const env = getEnv();
  const db = await getDb();
  const auth = createAuthFromEnv(env, db);

  console.log(`Seeding ${SEED_USERS.length} Coastal Eats accounts…`);
  console.log(`Default password: ${SEED_DEFAULT_PASSWORD}`);
  console.log("");

  for (const seedUser of SEED_USERS) {
    await ensureSeedUser(auth, db, seedUser);
  }

  console.log("");
  console.log("Done. Sign in at /auth with any seeded email.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
