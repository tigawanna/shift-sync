import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { loadStaffScheduleForUser } from "./staff-schedule.server";

export const listMyStaffScheduleInputSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM"),
});

export type ListMyStaffScheduleInput = z.infer<typeof listMyStaffScheduleInputSchema>;
export type {
  StaffScheduleQueryMeta,
  StaffScheduleResult,
  StaffScheduleShift,
} from "./staff-schedule.server";

export const listMyStaffSchedule = createServerFn({ method: "GET" })
  .validator((data: ListMyStaffScheduleInput) => listMyStaffScheduleInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    return loadStaffScheduleForUser(data.month, session.user.id);
  });
