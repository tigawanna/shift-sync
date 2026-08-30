import { AppConfig } from "@/utils/system";
import { createFileRoute, Outlet, retainSearchParams } from "@tanstack/react-router";
import { z } from "zod";
import { locationQueryOptions } from "./-data-access-layer/locations.query-options";
import { DashboardPageHeader } from "../-components/DashboardPageHeader";
import { AdminScheduleLocationPicker } from "./schedules/-components/AdminScheduleLocationPicker";
import { AdminSchedulesNav } from "./schedules/-components/AdminSchedulesNav";

const schedulesLayoutSearchSchema = z.object({
  locationId: z.string().optional(),
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const Route = createFileRoute("/_dashboard/admin/schedules")({
  validateSearch: schedulesLayoutSearchSchema,
  search: {
    middlewares: [retainSearchParams(["locationId", "weekStart"])],
  },
  loaderDeps: ({ search }) => ({ locationId: search.locationId }),
  loader: async ({ context, deps }) => {
    if (!deps.locationId) return;
    await context.queryClient.ensureQueryData(locationQueryOptions(deps.locationId));
  },
  component: AdminSchedulesLayout,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Schedules` }],
  }),
});

function AdminSchedulesLayout() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Schedules"
        description="Overtime and fairness, who's working, and who's on a shift right now. Filter to one restaurant when you need to."
      />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <AdminScheduleLocationPicker />
        <AdminSchedulesNav />
      </div>
      <Outlet />
    </div>
  );
}
