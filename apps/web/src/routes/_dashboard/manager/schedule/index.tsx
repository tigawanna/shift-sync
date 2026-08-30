import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { listManagerSchedulesQueryOptions } from "../-data-access-layer/manager-schedule.query-options";
import { ListSchedules } from "./-components/ListSchedules";

const scheduleSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
  sq: z.string().optional(),
  locationId: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/manager/schedule/")({
  validateSearch: (search) => scheduleSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    page: search.page,
    perPage: search.perPage,
    sq: search.sq,
    locationId: search.locationId,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      listManagerSchedulesQueryOptions({
        page: deps.page ?? 1,
        perPage: deps.perPage ?? ADMIN_LIST_PER_PAGE,
        sq: deps.sq,
        locationId: deps.locationId,
      }),
    );
  },
  component: ManagerSchedulesPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Schedule` }],
  }),
});

function ManagerSchedulesPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Schedule"
        description="Every location-week you manage. Open one to edit shifts, publish, unpublish, or delete."
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <ListSchedules />
      </Suspense>
    </div>
  );
}
