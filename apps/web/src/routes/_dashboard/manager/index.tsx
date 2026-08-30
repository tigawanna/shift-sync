import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { DashboardPageHeader } from "../-components/DashboardPageHeader";
import { managerOnDutyNowQueryOptions } from "./-data-access-layer/manager-on-duty.query-options";
import { ManagerOverview } from "./-components/ManagerOverview";

export const Route = createFileRoute("/_dashboard/manager/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(managerOnDutyNowQueryOptions());
  },
  component: ManagerOverviewPage,
  pendingComponent: RouterPendingComponent,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Manager` }],
  }),
});

function ManagerOverviewPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Manager"
        description="Build a location week, then publish it. Staff only see shifts after that."
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <ManagerOverview />
      </Suspense>
    </div>
  );
}
