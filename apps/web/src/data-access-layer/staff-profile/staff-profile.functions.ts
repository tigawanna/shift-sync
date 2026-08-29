import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import {
  skill as skillTable,
  userAvailability as userAvailabilityTable,
  userAvailabilityException as userAvailabilityExceptionTable,
  userSkill as userSkillTable,
} from "@/lib/drizzle/schema/skills-schema";
import { AVAILABILITY_EXCEPTION_KINDS } from "@/lib/schedule/availability";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, inArray } from "drizzle-orm";
import { requireSessionRoles } from "../team/team.auth";
import {
  addAvailabilityExceptionInputSchema,
  removeAvailabilityExceptionInputSchema,
  replaceMyAvailabilityInputSchema,
  type AddAvailabilityExceptionInput,
  type ReplaceMyAvailabilityInput,
  type StaffProfile,
} from "./staff-profile.types";

function parseExceptionKind(kind: string) {
  if (kind === "blocked" || kind === "extra") return kind;
  return AVAILABILITY_EXCEPTION_KINDS[0];
}

export async function loadStaffProfile(userId: string): Promise<StaffProfile> {
  const db = await getDb();

  const [userRow] = await db
    .select({ id: userTable.id, name: userTable.name, email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!userRow) {
    throw new Error("User not found.");
  }

  const [locationRows, skillRows, weeklyRows, exceptionRows] = await Promise.all([
    db
      .select({
        id: locationTable.id,
        name: locationTable.name,
        timezone: locationTable.timezone,
        address: locationTable.address,
      })
      .from(userLocation)
      .innerJoin(locationTable, eq(userLocation.locationId, locationTable.id))
      .where(eq(userLocation.userId, userId))
      .orderBy(asc(locationTable.name)),
    db
      .select({
        id: skillTable.id,
        name: skillTable.name,
      })
      .from(userSkillTable)
      .innerJoin(skillTable, eq(userSkillTable.skillId, skillTable.id))
      .where(eq(userSkillTable.userId, userId))
      .orderBy(asc(skillTable.name)),
    db
      .select()
      .from(userAvailabilityTable)
      .where(eq(userAvailabilityTable.userId, userId))
      .orderBy(asc(userAvailabilityTable.weekday), asc(userAvailabilityTable.startMinute)),
    db
      .select()
      .from(userAvailabilityExceptionTable)
      .where(eq(userAvailabilityExceptionTable.userId, userId))
      .orderBy(asc(userAvailabilityExceptionTable.date), asc(userAvailabilityExceptionTable.startMinute)),
  ]);

  return {
    userId: userRow.id,
    name: userRow.name,
    email: userRow.email,
    locations: locationRows.map((row) => ({
      id: row.id,
      name: row.name,
      timezone: row.timezone,
      address: row.address ?? null,
    })),
    skills: skillRows,
    weeklyWindows: weeklyRows.map((row) => ({
      id: row.id,
      weekday: row.weekday,
      startMinute: row.startMinute,
      endMinute: row.endMinute,
    })),
    exceptions: exceptionRows.map((row) => ({
      id: row.id,
      date: row.date,
      kind: parseExceptionKind(row.kind),
      startMinute: row.startMinute,
      endMinute: row.endMinute,
      note: row.note ?? null,
    })),
  };
}

/** Staff: certified locations, skills, weekly windows, and one-off exceptions. */
export const getMyStaffProfile = createServerFn({ method: "GET" }).handler(async () => {
  const { session } = await requireSessionRoles([ROLE.staff]);
  return loadStaffProfile(session.user.id);
});

/** Staff replace their recurring weekly availability in one save. */
export const replaceMyAvailability = createServerFn({ method: "POST" })
  .validator((data: ReplaceMyAvailabilityInput) => replaceMyAvailabilityInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    const db = await getDb();
    const userId = session.user.id;

    await db.delete(userAvailabilityTable).where(eq(userAvailabilityTable.userId, userId));

    const uniqueWindows = new Map<string, ReplaceMyAvailabilityInput["windows"][number]>();
    for (const window of data.windows) {
      uniqueWindows.set(`${window.weekday}:${window.startMinute}`, window);
    }

    if (uniqueWindows.size > 0) {
      await db.insert(userAvailabilityTable).values(
        [...uniqueWindows.values()].map((window) => ({
          id: crypto.randomUUID(),
          userId,
          weekday: window.weekday,
          startMinute: window.startMinute,
          endMinute: window.endMinute,
        })),
      );
    }

    return loadStaffProfile(userId);
  });

/** Staff add a blocked day or extra one-off window. */
export const addMyAvailabilityException = createServerFn({ method: "POST" })
  .validator((data: AddAvailabilityExceptionInput) =>
    addAvailabilityExceptionInputSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    const db = await getDb();
    const userId = session.user.id;

    await db.insert(userAvailabilityExceptionTable).values({
      id: crypto.randomUUID(),
      userId,
      date: data.date,
      kind: data.kind,
      startMinute: data.startMinute,
      endMinute: data.endMinute,
      note: data.note?.trim() || null,
    });

    return loadStaffProfile(userId);
  });

/** Staff remove one of their availability exceptions. */
export const removeMyAvailabilityException = createServerFn({ method: "POST" })
  .validator((data: unknown) => removeAvailabilityExceptionInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    const db = await getDb();
    const userId = session.user.id;

    const deleted = await db
      .delete(userAvailabilityExceptionTable)
      .where(
        and(
          eq(userAvailabilityExceptionTable.id, data.exceptionId),
          eq(userAvailabilityExceptionTable.userId, userId),
        ),
      )
      .returning({ id: userAvailabilityExceptionTable.id });

    if (deleted.length === 0) {
      throw new Error("Exception not found.");
    }

    return loadStaffProfile(userId);
  });

export async function replaceUserSkills(userId: string, skillIds: string[]) {
  const db = await getDb();
  const uniqueSkillIds = [...new Set(skillIds)];

  if (uniqueSkillIds.length > 0) {
    const existing = await db
      .select({ id: skillTable.id })
      .from(skillTable)
      .where(inArray(skillTable.id, uniqueSkillIds));
    if (existing.length !== uniqueSkillIds.length) {
      throw new Error("One or more skills were not found.");
    }
  }

  await db.delete(userSkillTable).where(eq(userSkillTable.userId, userId));

  if (uniqueSkillIds.length > 0) {
    await db.insert(userSkillTable).values(
      uniqueSkillIds.map((skillId) => ({
        id: crypto.randomUUID(),
        userId,
        skillId,
      })),
    );
  }
}
