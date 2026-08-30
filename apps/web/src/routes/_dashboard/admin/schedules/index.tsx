import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { defaultWeekStartYmd } from "@/lib/schedule/oversight";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { adminLaborReportQueryOptions } from "../-data-access-layer/admin-schedules.query-options";
import { AdminSchedules } from "./-components/AdminSchedules";

const schedulesSearchSchema = z.object({
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .default(() => defaultWeekStartYmd()),
  locationId: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/admin/schedules/")({
  validateSearch: schedulesSearchSchema,
  loaderDeps: ({ search }) => ({
    weekStart: search.weekStart,
    locationId: search.locationId,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      adminLaborReportQueryOptions({
        locationId: deps.locationId,
        weekStart: deps.weekStart,
      }),
    );
  },
  component: AdminSchedulesLocationsPage,
  pendingComponent: RouterPendingComponent,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Overtime and fairness` }],
  }),
});

function AdminSchedulesLocationsPage() {
  return (
    <Suspense fallback={<RouterPendingComponent />}>
      <AdminSchedules />
    </Suspense>
  );
}
