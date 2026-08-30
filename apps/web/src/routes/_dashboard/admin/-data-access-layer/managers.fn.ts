import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema";
import { location as locationTable } from "@/lib/drizzle/schema/locations-schema";
import { queryManagerHome } from "@/lib/schedule/manager-home.server";
import { createServerFn } from "@tanstack/react-start";
import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { listUserLocationIds, replaceUserLocations } from "./locations.server";
import { listUsersByRolePage } from "./people-list.server";

export const listManagersInputSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional(),
  locationId: z.string().optional(),
});

export type ListManagersInput = z.infer<typeof listManagersInputSchema>;
export type ManagerListItem = typeof userTable.$inferSelect;

export const listManagers = createServerFn({ method: "GET" })
  .validator(listManagersInputSchema)
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);
    return listUsersByRolePage({
      role: ROLE.manager,
      page: data.page,
      perPage: data.perPage,
      sq: data.sq,
      locationId: data.locationId,
    });
  });

export const getManagerLocationsInputSchema = z.object({
  userId: z.string().min(1),
});

export const setManagerLocationsInputSchema = z.object({
  userId: z.string().min(1),
  locationIds: z.array(z.string().min(1)),
});

async function assertAdminManager(userId: string) {
  await requireSessionRoles([ROLE.admin]);
  const db = await getDb();
  const [person] = await db
    .select({ id: userTable.id, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (!person || person.role !== ROLE.manager) {
    throw new Error("Manager not found.");
  }
}

export const getAdminManager = createServerFn({ method: "GET" })
  .validator(z.object({ managerId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);
    const db = await getDb();
    const [person] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, data.managerId))
      .limit(1);
    if (!person || person.role !== ROLE.manager) {
      throw new Error("Manager not found.");
    }
    return person;
  });

export const loadAdminManagerHome = createServerFn({ method: "GET" })
  .validator(z.object({ managerId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await assertAdminManager(data.managerId);
    const locationIds = await listUserLocationIds(data.managerId);
    const home = await queryManagerHome(locationIds);
    if (locationIds.length === 0) {
      return { ...home, locations: [] };
    }
    const db = await getDb();
    const locations = await db
      .select({ id: locationTable.id, name: locationTable.name })
      .from(locationTable)
      .where(inArray(locationTable.id, locationIds))
      .orderBy(asc(locationTable.name));
    return { ...home, locations };
  });

export const getManagerLocations = createServerFn({ method: "GET" })
  .validator(getManagerLocationsInputSchema)
  .handler(async ({ data }) => {
    await assertAdminManager(data.userId);
    const locationIds = await listUserLocationIds(data.userId);
    return { userId: data.userId, locationIds };
  });

export const setManagerLocations = createServerFn({ method: "POST" })
  .validator(setManagerLocationsInputSchema)
  .handler(async ({ data }) => {
    await assertAdminManager(data.userId);
    await replaceUserLocations(data.userId, data.locationIds);
    return { ok: true as const };
  });
