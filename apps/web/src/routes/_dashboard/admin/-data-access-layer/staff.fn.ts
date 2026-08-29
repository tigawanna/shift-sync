import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { ROLE } from "@/lib/better-auth/roles";
import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import { z } from "zod";

export const listStaffInputSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  q: z.string().optional(),
});

export type ListStaffInput = z.infer<typeof listStaffInputSchema>;

export type StaffListItem = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: Date;
};

export type StaffListPage = {
  items: StaffListItem[];
  total: number;
  page: number;
  perPage: typeof ADMIN_LIST_PER_PAGE;
  totalPages: number;
};

function buildSearchFilter(q: string | undefined): SQL | undefined {
  const trimmed = q?.trim();
  if (!trimmed) return undefined;

  const pattern = `%${trimmed}%`;
  return or(like(userTable.name, pattern), like(userTable.email, pattern));
}

export const listStaff = createServerFn({ method: "GET" })
  .validator((data: ListStaffInput) => listStaffInputSchema.parse(data ?? {}))
  .handler(async ({ data }): Promise<StaffListPage> => {
    await requireSessionRoles([ROLE.admin]);

    const page = data.page ?? 1;
    const perPage = ADMIN_LIST_PER_PAGE;
    const offset = (page - 1) * perPage;
    const where = and(eq(userTable.role, ROLE.staff), buildSearchFilter(data.q));

    const db = await getDb();
    const [rows, totalRow] = await Promise.all([
      db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          image: userTable.image,
          createdAt: userTable.createdAt,
        })
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
