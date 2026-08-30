import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import {
  myCoverageQueryOptions,
  myCoverageRequestsQueryOptions,
} from "../-data-access-layer/staff-coverage.query-options";
import { ListStaffCoverage } from "./-components/ListStaffCoverage";

const coverageSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
  status: z.enum(["all", "pending", "resolved"]).optional().default("all"),
});

export const Route = createFileRoute("/_dashboard/staff/coverage/")({
  validateSearch: coverageSearchSchema,
  loaderDeps: ({ search }) => ({
    page: search.page,
    perPage: search.perPage,
    sq: search.sq,
    status: search.status,
  }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(myCoverageQueryOptions()),
      context.queryClient.ensureQueryData(myCoverageRequestsQueryOptions(deps)),
    ]);
  },
  component: StaffCoveragePage,
  pendingComponent: RouterPendingComponent,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Coverage` }],
  }),
});

function StaffCoveragePage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Coverage"
        description="Accept incoming swaps, pick up open drops, and track every request until a manager approves. You stay on the original shift until then."
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <ListStaffCoverage />
      </Suspense>
    </div>
  );
}
