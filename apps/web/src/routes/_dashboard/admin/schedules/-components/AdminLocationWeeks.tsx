import { formatTimezone } from "@/utils/date";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { adminLocationWeeksQueryOptions } from "../../-data-access-layer/admin-schedules.query-options";

const routeApi = getRouteApi("/_dashboard/admin/schedules/");

export function AdminLocationWeeks() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { data: locations } = useSuspenseQuery(adminLocationWeeksQueryOptions(search.weekStart));

  return (
    <section className="flex flex-col gap-3" data-test="admin-location-weeks">
      <div>
        <h3 className="text-sm font-semibold">Every location this week</h3>
        <p className="text-muted-foreground text-xs">
          Select a location to see overtime and fairness. Times follow that location timezone.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-left text-xs tracking-wide uppercase">
              <th className="px-3 py-2 font-medium">Location</th>
              <th className="px-3 py-2 font-medium">Published</th>
              <th className="px-3 py-2 font-medium">Assignments</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((location) => {
              const selected = search.locationId === location.id;
              return (
                <tr key={location.id} className="border-t">
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className={selected ? "font-semibold" : "hover:underline"}
                      onClick={() =>
                        void navigate({
                          to: ".",
                          search: (prev) => ({
                            ...prev,
                            locationId: selected ? undefined : location.id,
                            page: undefined,
                          }),
                        })
                      }
                    >
                      {location.name}
                    </button>
                    <p className="text-muted-foreground text-xs">
                      {formatTimezone(location.timezone)}
                    </p>
                  </td>
                  <td className="px-3 py-2">{location.published ? "Yes" : "Draft"}</td>
                  <td className="px-3 py-2 tabular-nums">{location.assignmentCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
