import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { managerCoverageQueryOptions } from "../-data-access-layer/manager-coverage.query-options";
import { ListCoverage } from "./-components/ListCoverage";

export const Route = createFileRoute("/_dashboard/manager/requests/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(managerCoverageQueryOptions());
  },
  component: ManagerCoveragePage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Coverage` }],
  }),
});

function ManagerCoveragePage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Coverage"
        description="Approve or reject swaps and pickups. The original assignment stays until you approve."
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <ListCoverage />
      </Suspense>
    </div>
  );
}
