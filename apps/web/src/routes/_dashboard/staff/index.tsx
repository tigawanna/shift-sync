import { currentYearMonth } from "@/lib/time/zoned";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DashboardPageHeader } from "../-components/DashboardPageHeader";
import { myDesiredHoursQueryOptions } from "./-data-access-layer/staff-desired-hours.query-options";
import { myStaffAvailabilityQueryOptions } from "./-data-access-layer/staff-availability.query-options";
import { myStaffScheduleQueryOptions } from "./-data-access-layer/staff-schedule.query-options";
import { StaffSchedule } from "./-components/StaffSchedule";

const staffSearchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export const Route = createFileRoute("/_dashboard/staff/")({
  validateSearch: staffSearchSchema,
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: async ({ context, deps }) => {
    const month = deps.month ?? currentYearMonth("UTC");
    await Promise.allSettled([
      context.queryClient.ensureQueryData(myStaffScheduleQueryOptions({ month })),
      context.queryClient.ensureQueryData(myStaffAvailabilityQueryOptions({ month })),
      context.queryClient.ensureQueryData(myDesiredHoursQueryOptions({ month })),
    ]);
  },
  component: StaffHomePage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | My calendar` }],
  }),
});

function StaffHomePage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="My calendar"
        description="Published shifts, days you cannot work, and the hours you want each week."
      />
      <StaffSchedule />
    </div>
  );
}
