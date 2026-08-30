import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { DashboardPageHeader } from "../../../-components/DashboardPageHeader";
import { myManagerLocationsQueryOptions } from "../../-data-access-layer/manager-locations.query-options";
import { managerWeekScheduleQueryOptions } from "../../-data-access-layer/manager-schedule.query-options";
import { ManagerSchedule } from "../-components/ManagerSchedule";

const weekStartParams = z.object({
  locationId: z.string().min(1),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const Route = createFileRoute("/_dashboard/manager/schedule/$locationId/$weekStart")({
  params: {
    parse: (params) => weekStartParams.parse(params),
  },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(myManagerLocationsQueryOptions()),
      context.queryClient.ensureQueryData(
        managerWeekScheduleQueryOptions({
          locationId: params.locationId,
          weekStart: params.weekStart,
        }),
      ),
    ]);
  },
  component: ManagerScheduleWeekPage,
  pendingComponent: RouterPendingComponent,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Schedule week` }],
  }),
});

function ManagerScheduleWeekPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Schedule week"
        description="Edit this week on the board. Publish so staff can see it, or unpublish or delete before the 48-hour cutoff."
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <ManagerSchedule />
      </Suspense>
    </div>
  );
}
