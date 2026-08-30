import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { location as locationTable } from "@/lib/drizzle/schema";
import { createServerFn } from "@tanstack/react-start";
import { asc, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import { z } from "zod";

export const listLocationsInputSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional(),
});

export type ListLocationsInput = z.infer<typeof listLocationsInputSchema>;
export type LocationListItem = typeof locationTable.$inferSelect;

function buildSearchFilter(sq: string | undefined): SQL | undefined {
  const trimmed = sq?.trim();
  if (!trimmed) return undefined;

  const pattern = `%${trimmed}%`;
  return or(like(locationTable.name, pattern), like(locationTable.address, pattern));
}

export const listLocations = createServerFn({ method: "GET" })
  .validator(listLocationsInputSchema)
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);

    const page = data.page;
    const perPage = data.perPage;
    const offset = (page - 1) * perPage;
    const where = buildSearchFilter(data.sq);

    const db = await getDb();
    const [rows, totalRow] = await Promise.all([
      db
        .select()
        .from(locationTable)
        .where(where)
        .orderBy(desc(locationTable.createdAt))
        .limit(perPage)
        .offset(offset),
      db.select({ total: count() }).from(locationTable).where(where),
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

export const LOCATION_TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Phoenix",
] as const;

const locationTimezoneSchema = z.enum(LOCATION_TIMEZONES);

const locationFieldsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  timezone: locationTimezoneSchema,
  address: z.string().trim().max(200).optional(),
});

export const createLocationInputSchema = locationFieldsSchema;
export const updateLocationInputSchema = locationFieldsSchema.extend({
  locationId: z.string().min(1),
});

export const getLocation = createServerFn({ method: "GET" })
  .validator(z.object({ locationId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);
    const db = await getDb();
    const [row] = await db
      .select({
        id: locationTable.id,
        name: locationTable.name,
        timezone: locationTable.timezone,
      })
      .from(locationTable)
      .where(eq(locationTable.id, data.locationId))
      .limit(1);
    if (!row) throw new Error("Location not found.");
    return row;
  });

export const listLocationOptions = createServerFn({ method: "GET" }).handler(async () => {
  await requireSessionRoles([ROLE.admin]);
  const db = await getDb();
  return db
    .select({
      id: locationTable.id,
      name: locationTable.name,
      timezone: locationTable.timezone,
    })
    .from(locationTable)
    .orderBy(asc(locationTable.name));
});

export const createLocation = createServerFn({ method: "POST" })
  .validator(createLocationInputSchema)
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);
    const db = await getDb();
    const [created] = await db
      .insert(locationTable)
      .values({
        id: crypto.randomUUID(),
        name: data.name,
        timezone: data.timezone,
        address: data.address || null,
      })
      .returning();
    return created;
  });

export const updateLocation = createServerFn({ method: "POST" })
  .validator(updateLocationInputSchema)
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);
    const db = await getDb();
    const [updated] = await db
      .update(locationTable)
      .set({
        name: data.name,
        timezone: data.timezone,
        address: data.address || null,
      })
      .where(eq(locationTable.id, data.locationId))
      .returning();
    if (!updated) throw new Error("Location not found.");
    return updated;
  });
