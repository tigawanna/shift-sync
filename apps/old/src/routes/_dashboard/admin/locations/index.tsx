import { AppConfig } from "@/utils/system";
import { locationsQueryOptions } from "@/data-access-layer/location/location.queries";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { CreateLocationForm } from "../../-components/location/CreateLocationForm";
import { ListLocations } from "./-components/ListLocations";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { z } from "zod";

const locationsSearchSchema = z.object({
  page: z.number().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/admin/locations/")({
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
  component: AdminLocationsPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Locations` }],
  }),
});

function AdminLocationsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  function refreshLocations() {
    void qc.invalidateQueries({ queryKey: ["locations"] });
    setShowCreate(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Locations"
        description="Coastal Eats restaurants across two time zones. Assign managers and staff certifications from here once scheduling is enabled."
        actions={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreate(true)}
          >
            Add location
          </button>
        }
      />

      {showCreate ? (
        <CreateLocationForm onCancel={() => setShowCreate(false)} onCreated={refreshLocations} />
      ) : null}

      <Suspense fallback={<RouterPendingComponent />}>
        <ListLocations />
      </Suspense>
    </div>
  );
}
