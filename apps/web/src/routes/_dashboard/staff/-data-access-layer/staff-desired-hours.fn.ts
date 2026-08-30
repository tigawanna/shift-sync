import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { loadDesiredHoursForMonth, upsertDesiredHoursForWeek } from "./staff-desired-hours.server";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM");
const mondaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const listMyDesiredHoursInputSchema = z.object({
  month: monthSchema,
});

export const upsertMyDesiredHoursInputSchema = z.object({
  weekStartDate: mondaySchema,
  hours: z.number().int().min(0).max(60).nullable(),
});

export type ListMyDesiredHoursInput = z.infer<typeof listMyDesiredHoursInputSchema>;

export const listMyDesiredHours = createServerFn({ method: "GET" })
  .validator(listMyDesiredHoursInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    return loadDesiredHoursForMonth(session.user.id, data.month);
  });

export const upsertMyDesiredHours = createServerFn({ method: "POST" })
  .validator(upsertMyDesiredHoursInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    return upsertDesiredHoursForWeek(session.user.id, data.weekStartDate, data.hours);
  });
