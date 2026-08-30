import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { managerCoverageQueryOptions } from "../-data-access-layer/manager-coverage.query-options";
import { ListCoverage } from "./-components/ListCoverage";

const coverageSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
  status: z.enum(["all", "pending", "resolved"]).optional().default("pending"),
});

export const Route = createFileRoute("/_dashboard/manager/requests/")({
  validateSearch: coverageSearchSchema,
  loaderDeps: ({ search }) => ({
    page: search.page,
    perPage: search.perPage,
    sq: search.sq,
    status: search.status,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(managerCoverageQueryOptions(deps));
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
        description="Approve or reject swaps and pickups. The original assignment stays until you approve. Resolved keeps the record of what you already decided."
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <ListCoverage />
      </Suspense>
    </div>
  );
}
