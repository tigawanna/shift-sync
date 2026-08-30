import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import { listUserLocationIds, replaceUserLocations } from "./locations.server";

export const listManagersInputSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional(),
});

export type ListManagersInput = z.infer<typeof listManagersInputSchema>;
export type ManagerListItem = typeof userTable.$inferSelect;

function buildSearchFilter(sq: string | undefined): SQL | undefined {
  const trimmed = sq?.trim();
  if (!trimmed) return undefined;

  const pattern = `%${trimmed}%`;
  return or(like(userTable.name, pattern), like(userTable.email, pattern));
}

export const listManagers = createServerFn({ method: "GET" })
  .validator(listManagersInputSchema)
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);

    const page = data.page;
    const perPage = data.perPage;
    const offset = (page - 1) * perPage;
    const where = and(eq(userTable.role, ROLE.manager), buildSearchFilter(data.sq));

    const db = await getDb();
    const [rows, totalRow] = await Promise.all([
      db
        .select()
        .from(userTable)
        .where(where)
        .orderBy(desc(userTable.createdAt))
        .limit(perPage)
        .offset(offset),
      db.select({ total: count() }).from(userTable).where(where),
    ]);

    const total = totalRow[0]?.total ?? 0;

    return {
      items: rows,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
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
