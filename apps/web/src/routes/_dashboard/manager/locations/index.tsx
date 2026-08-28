import { AppConfig } from "@/utils/system";
import { locationsQueryOptions } from "@/data-access-layer/location/location.queries";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { ListManagerLocations } from "./-components/ListLocations";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { z } from "zod";

const locationsSearchSchema = z.object({
  page: z.number().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/manager/locations/")({
  validateSearch: (search) => locationsSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({ page: search.page, q: search.q }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      locationsQueryOptions({
        page: deps.page,
        search: deps.q || undefined,
      }),
    );
  },
  component: ManagerLocationsPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Locations` }],
  }),
});

function ManagerLocationsPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Your locations"
        description="Restaurants you manage. Shift scheduling and staff assignments will respect these locations."
      />

      <Suspense fallback={<RouterPendingComponent />}>
        <ListManagerLocations />
      </Suspense>
    </div>
  );
}
