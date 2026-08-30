import type { AppRole } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { user as userTable, userLocation } from "@/lib/drizzle/schema";
import { and, count, desc, eq, getTableColumns, like, or, type SQL } from "drizzle-orm";

function buildSearchFilter(sq: string | undefined): SQL | undefined {
  const trimmed = sq?.trim();
  if (!trimmed) return undefined;

  const pattern = `%${trimmed}%`;
  return or(like(userTable.name, pattern), like(userTable.email, pattern));
}

export async function listUsersByRolePage(input: {
  role: AppRole;
  page: number;
  perPage: number;
  sq: string | undefined;
  locationId: string | undefined;
}) {
  const db = await getDb();
  const offset = (input.page - 1) * input.perPage;
  const roleWhere = and(eq(userTable.role, input.role), buildSearchFilter(input.sq));

  const locationId = input.locationId?.trim() || undefined;

  if (locationId) {
    const where = and(roleWhere, eq(userLocation.locationId, locationId));
    const [rows, totalRow] = await Promise.all([
      db
        .select(getTableColumns(userTable))
        .from(userTable)
        .innerJoin(userLocation, eq(userLocation.userId, userTable.id))
        .where(where)
        .orderBy(desc(userTable.createdAt))
        .limit(input.perPage)
        .offset(offset),
      db
        .select({ total: count() })
        .from(userTable)
        .innerJoin(userLocation, eq(userLocation.userId, userTable.id))
        .where(where),
    ]);
    const total = totalRow[0]?.total ?? 0;
    return {
      items: rows,
      total,
      page: input.page,
      perPage: input.perPage,
      totalPages: Math.max(1, Math.ceil(total / input.perPage)),
    };
  }

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(userTable)
      .where(roleWhere)
      .orderBy(desc(userTable.createdAt))
      .limit(input.perPage)
      .offset(offset),
    db.select({ total: count() }).from(userTable).where(roleWhere),
  ]);
  const total = totalRow[0]?.total ?? 0;
  return {
    items: rows,
    total,
    page: input.page,
    perPage: input.perPage,
    totalPages: Math.max(1, Math.ceil(total / input.perPage)),
  };
}
