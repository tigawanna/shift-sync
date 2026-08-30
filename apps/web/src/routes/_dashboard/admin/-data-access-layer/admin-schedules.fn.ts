import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { loadLaborReport } from "@/lib/schedule/labor.server";
import {
  loadLocationWeekSummaries,
  loadOnDutyNow,
  loadWhoWorksWhere,
} from "@/lib/schedule/oversight.server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const weekStartSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const adminWhoWorksInputSchema = z.object({
  weekStart: weekStartSchema,
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
  locationId: z.string().optional(),
});

export type AdminWhoWorksInput = z.infer<typeof adminWhoWorksInputSchema>;

export const listAdminOnDutyNow = createServerFn({ method: "GET" }).handler(async () => {
  await requireSessionRoles([ROLE.admin]);
  return loadOnDutyNow();
});

export const listAdminLocationWeeks = createServerFn({ method: "GET" })
  .validator(z.object({ weekStart: weekStartSchema }))
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);
    return loadLocationWeekSummaries(data.weekStart);
  });

export const listAdminWhoWorksWhere = createServerFn({ method: "GET" })
  .validator(adminWhoWorksInputSchema)
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);
    return loadWhoWorksWhere({
      weekStart: data.weekStart,
      page: data.page,
      perPage: data.perPage,
      sq: data.sq,
      locationId: data.locationId,
    });
  });

export const getAdminLaborReport = createServerFn({ method: "GET" })
  .validator(
    z.object({
      locationId: z.string().min(1),
      weekStart: weekStartSchema,
    }),
  )
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);
    return loadLaborReport(data.locationId, data.weekStart);
  });
