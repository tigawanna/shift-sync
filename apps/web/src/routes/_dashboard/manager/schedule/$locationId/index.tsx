import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { formatTimezone } from "@/utils/date";
import { AppConfig } from "@/utils/system";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { DashboardPageHeader } from "../../../-components/DashboardPageHeader";
import { myManagerLocationsQueryOptions } from "../../-data-access-layer/manager-locations.query-options";
import { listManagerSchedulesQueryOptions } from "../../-data-access-layer/manager-schedule.query-options";
import { ListLocationSchedules } from "./-components/ListLocationSchedules";

const locationScheduleSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
});

export const Route = createFileRoute("/_dashboard/manager/schedule/$locationId/")({
  params: {
    parse: (params) => ({ locationId: z.string().min(1).parse(params.locationId) }),
  },
  validateSearch: locationScheduleSearchSchema,
  loaderDeps: ({ search }) => ({
    page: search.page,
    perPage: search.perPage,
    sq: search.sq,
  }),
  loader: async ({ context, params, deps }) => {
    const locations = await context.queryClient.ensureQueryData(myManagerLocationsQueryOptions());
    const location = locations.items.find((item) => item.id === params.locationId);
    if (!location) return;
    await context.queryClient.ensureQueryData(
      listManagerSchedulesQueryOptions({
        page: deps.page,
        perPage: deps.perPage,
        sq: deps.sq,
        locationId: params.locationId,
      }),
    );
  },
  component: ManagerLocationSchedulesPage,
  pendingComponent: RouterPendingComponent,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Schedule` }],
  }),
});

function ManagerLocationSchedulesPage() {
  const { locationId } = Route.useParams();
  const { data } = useSuspenseQuery(myManagerLocationsQueryOptions());
  const location = data.items.find((item) => item.id === locationId);

  if (!location) {
    return (
      <div className="flex flex-col gap-4">
        <DashboardPageHeader
          title="Location not found"
          description="You do not manage this restaurant, or it was removed."
        />
        <Link to="/manager/schedule" className="btn btn-outline btn-sm w-fit">
          All schedules
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title={location.name}
        description={`Weeks at this location. Times follow ${formatTimezone(location.timezone)}.`}
        actions={
          <Link to="/manager/schedule" className="btn btn-ghost btn-sm">
            All schedules
          </Link>
        }
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <ListLocationSchedules locationId={location.id} timezone={location.timezone} />
      </Suspense>
    </div>
  );
}
