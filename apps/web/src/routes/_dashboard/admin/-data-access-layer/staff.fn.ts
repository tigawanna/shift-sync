import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { ROLE } from "@/lib/better-auth/roles";
import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema";
import { skill as skillTable, userSkill } from "@/lib/drizzle/schema/skills-schema";
import { createServerFn } from "@tanstack/react-start";
import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { listUserLocationIds, replaceUserLocations } from "./locations.server";
import { listUsersByRolePage } from "./people-list.server";

export const listStaffInputSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional(),
  locationId: z.string().optional(),
});

export type ListStaffInput = z.infer<typeof listStaffInputSchema>;
export type StaffListItem = typeof userTable.$inferSelect;

export const listStaff = createServerFn({ method: "GET" })
  .validator(listStaffInputSchema)
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);
    return listUsersByRolePage({
      role: ROLE.staff,
      page: data.page,
      perPage: data.perPage,
      sq: data.sq,
      locationId: data.locationId,
    });
  });

export const getStaffDirectoryInputSchema = z.object({
  userId: z.string().min(1),
});

export const setStaffDirectoryInputSchema = z.object({
  userId: z.string().min(1),
  skillIds: z.array(z.string().min(1)),
  locationIds: z.array(z.string().min(1)),
});

async function assertAdminStaff(userId: string) {
  await requireSessionRoles([ROLE.admin]);
  const db = await getDb();
  const [person] = await db
    .select({ id: userTable.id, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (!person || person.role !== ROLE.staff) {
    throw new Error("Staff member not found.");
  }
}

async function replaceUserSkills(userId: string, skillIds: string[]) {
  const unique = [...new Set(skillIds)];
  const db = await getDb();
  if (unique.length > 0) {
    const found = await db
      .select({ id: skillTable.id })
      .from(skillTable)
      .where(inArray(skillTable.id, unique));
    if (found.length !== unique.length) {
      throw new Error("One or more skills were not found.");
    }
  }
  await db.transaction(async (tx) => {
    await tx.delete(userSkill).where(eq(userSkill.userId, userId));
    if (unique.length === 0) return;
    await tx.insert(userSkill).values(
      unique.map((skillId) => ({
        id: crypto.randomUUID(),
        userId,
        skillId,
      })),
    );
  });
}

export const listSkillOptions = createServerFn({ method: "GET" }).handler(async () => {
  await requireSessionRoles([ROLE.admin]);
  const db = await getDb();
  return db
    .select({ id: skillTable.id, name: skillTable.name })
    .from(skillTable)
    .orderBy(asc(skillTable.name));
});

export const getStaffDirectory = createServerFn({ method: "GET" })
  .validator(getStaffDirectoryInputSchema)
  .handler(async ({ data }) => {
    await assertAdminStaff(data.userId);
    const db = await getDb();
    const skillRows = await db
      .select({ skillId: userSkill.skillId })
      .from(userSkill)
      .where(eq(userSkill.userId, data.userId));
    const locationIds = await listUserLocationIds(data.userId);
    return {
      userId: data.userId,
      skillIds: skillRows.map((row) => row.skillId),
      locationIds,
    };
  });

export const setStaffDirectory = createServerFn({ method: "POST" })
  .validator(setStaffDirectoryInputSchema)
  .handler(async ({ data }) => {
    await assertAdminStaff(data.userId);
    await replaceUserSkills(data.userId, data.skillIds);
    await replaceUserLocations(data.userId, data.locationIds);
    return { ok: true as const };
  });
