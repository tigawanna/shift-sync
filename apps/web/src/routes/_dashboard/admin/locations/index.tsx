import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { listLocationsQueryOptions } from "../-data-access-layer/locations.query-options";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { LocationList } from "./-components/LocationList";
import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";

const locationsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/admin/locations/")({
  validateSearch: (search) => locationsSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    page: search.page,
    perPage: search.perPage,
    sq: search.sq,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      listLocationsQueryOptions({
        page: deps.page,
        perPage: deps.perPage,
        sq: deps.sq,
      }),
    );
  },
  component: AdminLocationsPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Locations` }],
  }),
});

function AdminLocationsPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Locations"
        description="Coastal Eats restaurants across time zones."
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <LocationList />
      </Suspense>
    </div>
  );
}
