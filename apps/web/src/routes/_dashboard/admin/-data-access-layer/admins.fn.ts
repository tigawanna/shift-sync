import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { user as userTable } from "@/lib/drizzle/schema";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listUsersByRolePage } from "./people-list.server";

export const listAdminsInputSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional(),
  locationId: z.string().optional(),
});

export type ListAdminsInput = z.infer<typeof listAdminsInputSchema>;
export type AdminListItem = typeof userTable.$inferSelect;

export const listAdmins = createServerFn({ method: "GET" })
  .validator(listAdminsInputSchema)
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);
    return listUsersByRolePage({
      role: ROLE.admin,
      page: data.page,
      perPage: data.perPage,
      sq: data.sq,
      locationId: data.locationId,
    });
  });
