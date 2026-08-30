import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { myManagerLocationsQueryOptions } from "../-data-access-layer/manager-locations.query-options";
import { listManagerTeamQueryOptions } from "../-data-access-layer/manager-team.query-options";
import { ListTeam } from "@/routes/_dashboard/manager/team/-components/ListTeam";

const teamSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
  locationId: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/manager/team/")({
  validateSearch: teamSearchSchema,
  loaderDeps: ({ search }) => ({
    page: search.page,
    perPage: search.perPage,
    sq: search.sq,
    locationId: search.locationId,
  }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        listManagerTeamQueryOptions({
          page: deps.page,
          perPage: deps.perPage,
          sq: deps.sq,
          locationId: deps.locationId,
        }),
      ),
      context.queryClient.ensureQueryData(myManagerLocationsQueryOptions()),
    ]);
  },
  component: ManagerTeamPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Team` }],
  }),
});

function ManagerTeamPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Team"
        description="Staff certified at the locations you manage. Skills and certs are set by admin."
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <ListTeam />
      </Suspense>
    </div>
  );
}
