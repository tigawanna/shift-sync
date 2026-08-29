import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { location as locationTable } from "@/lib/drizzle/schema";
import { createServerFn } from "@tanstack/react-start";
import { count, desc, like, or, type SQL } from "drizzle-orm";
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

    const page = data.page
    const perPage = data.perPage
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
