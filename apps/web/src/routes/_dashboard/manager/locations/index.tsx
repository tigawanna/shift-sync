import { AppConfig } from "@/utils/system";
import { formatTimezone } from "@/utils/date";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { myManagerLocationsQueryOptions } from "../-data-access-layer/manager-locations.query-options";

export const Route = createFileRoute("/_dashboard/manager/locations/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(myManagerLocationsQueryOptions());
  },
  component: ManagerLocationsPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Locations` }],
  }),
});

function ManagerLocationsPage() {
  const locationsQuery = useQuery(myManagerLocationsQueryOptions());
  const locations = locationsQuery.data?.items ?? [];

  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Locations"
        description="Only the restaurants assigned to you. Open a location to see its weeks."
      />
      {locationsQuery.isPending ? (
        <p className="text-muted-foreground text-sm">Loading locations…</p>
      ) : null}
      {locationsQuery.isError ? (
        <p className="text-destructive text-sm">Locations could not be loaded.</p>
      ) : null}
      {locationsQuery.isSuccess && locations.length === 0 ? (
        <p className="text-muted-foreground text-sm">You are not assigned to any locations yet.</p>
      ) : null}
      {locations.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2" data-test="manager-locations">
          {locations.map((location) => (
            <li key={location.id} className="rounded-xl border p-5">
              <h2 className="font-semibold tracking-tight">{location.name}</h2>
              <p className="text-muted-foreground mt-1 font-mono text-xs">
                {formatTimezone(location.timezone)}
              </p>
              {location.address ? (
                <p className="text-muted-foreground mt-2 text-sm">{location.address}</p>
              ) : null}
              <Link
                to="/manager/schedule"
                search={{ locationId: location.id }}
                className="btn btn-ghost btn-sm mt-4"
              >
                View schedules
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
