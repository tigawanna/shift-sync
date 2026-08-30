import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import { skill as skillTable, userSkill } from "@/lib/drizzle/schema/skills-schema";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, countDistinct, eq, inArray, like, or } from "drizzle-orm";
import { z } from "zod";
import { loadMyManagerLocations } from "./manager-locations.server";

export const listManagerTeamInputSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
  locationId: z.string().optional(),
});

export type ListManagerTeamInput = z.infer<typeof listManagerTeamInputSchema>;

function staffNameSearch(sq: string) {
  const trimmed = sq.trim();
  if (!trimmed) return undefined;
  const pattern = `%${trimmed}%`;
  return or(like(userTable.name, pattern), like(userTable.email, pattern));
}

export const listManagerTeam = createServerFn({ method: "GET" })
  .validator(listManagerTeamInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const managed = await loadMyManagerLocations(session.user.id);
    const managedIds = managed.map((location) => location.id);
    const page = data.page;
    const perPage = data.perPage;
    const empty = {
      items: [],
      total: 0,
      page,
      perPage,
      totalPages: 1,
    };

    if (managedIds.length === 0) return empty;

    const scopedIds =
      data.locationId && managedIds.includes(data.locationId) ? [data.locationId] : managedIds;

    const where = and(
      eq(userTable.role, ROLE.staff),
      inArray(userLocation.locationId, scopedIds),
      staffNameSearch(data.sq),
    );

    const db = await getDb();
    const [rows, totalRow] = await Promise.all([
      db
        .selectDistinct({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          image: userTable.image,
        })
        .from(userTable)
        .innerJoin(userLocation, eq(userLocation.userId, userTable.id))
        .where(where)
        .orderBy(asc(userTable.name))
        .limit(perPage)
        .offset((page - 1) * perPage),
      db
        .select({ total: countDistinct(userTable.id) })
        .from(userTable)
        .innerJoin(userLocation, eq(userLocation.userId, userTable.id))
        .where(where),
    ]);

    const total = totalRow[0]?.total ?? 0;
    const userIds = rows.map((row) => row.id);
    if (userIds.length === 0) {
      return {
        items: [],
        total,
        page,
        perPage,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      };
    }

    const [skillRows, locationRows] = await Promise.all([
      db
        .select({
          userId: userSkill.userId,
          name: skillTable.name,
        })
        .from(userSkill)
        .innerJoin(skillTable, eq(skillTable.id, userSkill.skillId))
        .where(inArray(userSkill.userId, userIds))
        .orderBy(asc(skillTable.name)),
      db
        .select({
          userId: userLocation.userId,
          name: locationTable.name,
        })
        .from(userLocation)
        .innerJoin(locationTable, eq(locationTable.id, userLocation.locationId))
        .where(
          and(inArray(userLocation.userId, userIds), inArray(userLocation.locationId, scopedIds)),
        )
        .orderBy(asc(locationTable.name)),
    ]);

    const skillsByUser = new Map<string, string[]>();
    for (const row of skillRows) {
      const list = skillsByUser.get(row.userId) ?? [];
      list.push(row.name);
      skillsByUser.set(row.userId, list);
    }
    const locationsByUser = new Map<string, string[]>();
    for (const row of locationRows) {
      const list = locationsByUser.get(row.userId) ?? [];
      list.push(row.name);
      locationsByUser.set(row.userId, list);
    }

    return {
      items: rows.map((person) => ({
        ...person,
        skills: skillsByUser.get(person.id) ?? [],
        locations: locationsByUser.get(person.id) ?? [],
      })),
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  });
