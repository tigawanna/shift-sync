import { getEnv } from "../src/env";
import { ROLE } from "../src/lib/better-auth/roles";
import { getDb } from "../src/lib/drizzle/client";
import { user as userTable } from "../src/lib/drizzle/schema/auth-schema";
import {
  location as locationTable,
  userLocation,
} from "../src/lib/drizzle/schema/locations-schema";
import {
  scheduleWeek as scheduleWeekTable,
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "../src/lib/drizzle/schema/schedule-schema";
import {
  skill as skillTable,
  userAvailability as userAvailabilityTable,
  userSkill as userSkillTable,
} from "../src/lib/drizzle/schema/skills-schema";
import { addDaysYmd, mondayOfWeekContaining, zonedWallTimeToUtc } from "../src/lib/time/zoned";
import { createAuthFromEnv } from "../src/server/create-auth";
import { and, eq } from "drizzle-orm";
import { SEED_LOCATIONS, SEED_USER_LOCATIONS } from "./seed/locations.data";
import {
  buildHarborHouseWeekShifts,
  buildSeedAvailability,
  buildSeedUserSkills,
  harborHouseStaffEmails,
  SEED_SKILLS,
} from "./seed/schedule.data";
import { SEED_DEFAULT_PASSWORD, SEED_USERS } from "./seed/users.data";

async function ensureSeedUser(
  auth: Awaited<ReturnType<typeof createAuthFromEnv>>,
  db: Awaited<ReturnType<typeof getDb>>,
  seed: {
    name: string;
    email: string;
    role: typeof ROLE.admin | typeof ROLE.manager | typeof ROLE.staff;
  },
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
  console.log("Seeding skills, availability, and a Harbor House week…");

  for (const seedSkill of SEED_SKILLS) {
    await db
      .insert(skillTable)
      .values(seedSkill)
      .onConflictDoUpdate({ target: skillTable.id, set: { name: seedSkill.name } });
  }

  const userSkillValues = buildSeedUserSkills().flatMap((row) => {
    const userId = userIds.get(row.email);
    if (!userId) return [];
    return row.skillIds.map((skillId) => ({
      id: crypto.randomUUID(),
      userId,
      skillId,
    }));
  });
  if (userSkillValues.length > 0) {
    await db.insert(userSkillTable).values(userSkillValues).onConflictDoNothing();
  }

  const availabilityValues = buildSeedAvailability().flatMap((row) => {
    const userId = userIds.get(row.email);
    if (!userId) return [];
    return [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) =>
      row.windows.map((window) => ({
        id: crypto.randomUUID(),
        userId,
        weekday,
        startMinute: window.startMinute,
        endMinute: window.endMinute,
      })),
    );
  });
  if (availabilityValues.length > 0) {
    await db.insert(userAvailabilityTable).values(availabilityValues).onConflictDoNothing();
  }

  const harborHouse = SEED_LOCATIONS.find((location) => location.id === "loc-harbor-house");
  if (harborHouse) {
    const weekStart = mondayOfWeekContaining(new Date(), harborHouse.timezone);
    const creatorId = userIds.get("admin@coastaleats.test") ?? [...userIds.values()][0];
    const assigneeEmails = harborHouseStaffEmails();
    const shifts = buildHarborHouseWeekShifts(assigneeEmails);

    for (const spec of shifts) {
      const startDate = addDaysYmd(weekStart, spec.dayOffset);
      const endDate = spec.endTime <= spec.startTime ? addDaysYmd(startDate, 1) : startDate;
      const startsAt = zonedWallTimeToUtc(startDate, spec.startTime, harborHouse.timezone);
      const endsAt = zonedWallTimeToUtc(endDate, spec.endTime, harborHouse.timezone);

      await db
        .insert(shiftTable)
        .values({
          id: spec.id,
          locationId: spec.locationId,
          skillId: spec.skillId,
          startsAt,
          endsAt,
          headcountNeeded: spec.headcountNeeded,
          notes: spec.notes ?? null,
          createdByUserId: creatorId,
        })
        .onConflictDoUpdate({
          target: shiftTable.id,
          set: {
            skillId: spec.skillId,
            startsAt,
            endsAt,
            headcountNeeded: spec.headcountNeeded,
            notes: spec.notes ?? null,
          },
        });

      for (const email of spec.assigneeEmails) {
        const userId = userIds.get(email);
        if (!userId) continue;
        const existing = await db
          .select({ id: shiftAssignmentTable.id })
          .from(shiftAssignmentTable)
          .where(
            and(eq(shiftAssignmentTable.shiftId, spec.id), eq(shiftAssignmentTable.userId, userId)),
          )
          .limit(1);
        if (existing.length > 0) continue;
        await db.insert(shiftAssignmentTable).values({
          id: crypto.randomUUID(),
          shiftId: spec.id,
          userId,
        });
      }
    }

    const published = await db
      .select({ id: scheduleWeekTable.id })
      .from(scheduleWeekTable)
      .where(
        and(
          eq(scheduleWeekTable.locationId, harborHouse.id),
          eq(scheduleWeekTable.weekStartDate, weekStart),
        ),
      )
      .limit(1);

    if (published.length === 0 && creatorId) {
      await db.insert(scheduleWeekTable).values({
        id: crypto.randomUUID(),
        locationId: harborHouse.id,
        weekStartDate: weekStart,
        publishedAt: new Date(),
        publishedByUserId: creatorId,
      });
    }

    console.log(`Harbor House week ${weekStart} seeded and published.`);
  }

  console.log("");
  console.log("Done. Sign in at /auth with any seeded email.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
