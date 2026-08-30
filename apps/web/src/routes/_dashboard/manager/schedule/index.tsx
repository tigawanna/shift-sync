import { mondayOfWeekContaining } from "@/lib/time/zoned";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { myManagerLocationsQueryOptions } from "../-data-access-layer/manager-locations.query-options";
import { managerWeekScheduleQueryOptions } from "../-data-access-layer/manager-schedule.query-options";
import { ManagerSchedule } from "../-components/ManagerSchedule";

const scheduleSearchSchema = z.object({
  locationId: z.string().optional(),
  week: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const Route = createFileRoute("/_dashboard/manager/schedule/")({
  validateSearch: (search) => scheduleSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    locationId: search.locationId,
    week: search.week,
  }),
  loader: async ({ context, deps }) => {
    const locations = await context.queryClient.ensureQueryData(myManagerLocationsQueryOptions());
    const location =
      locations.items.find((item) => item.id === deps.locationId) ?? locations.items[0];
    if (!location) return;
    const weekStart = deps.week ?? mondayOfWeekContaining(new Date(), location.timezone);
    await context.queryClient.ensureQueryData(
      managerWeekScheduleQueryOptions({ locationId: location.id, weekStart }),
    );
  },
  component: ManagerSchedulePage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Schedule` }],
  }),
});

function ManagerSchedulePage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Schedule"
        description="Draft weeks stay hidden from staff until you publish. Times follow the location timezone."
      />
      <ManagerSchedule />
    </div>
  );
}
