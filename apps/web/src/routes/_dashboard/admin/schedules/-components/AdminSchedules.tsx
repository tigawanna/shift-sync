import { getRouteApi } from "@tanstack/react-router";
import { AdminLaborReport } from "./AdminLaborReport";
import { AdminWeekNav } from "./AdminWeekNav";

const routeApi = getRouteApi("/_dashboard/admin/schedules/");

export function AdminSchedules() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  return (
    <div className="flex flex-col gap-8">
      <AdminWeekNav
        weekStart={search.weekStart}
        onChange={(weekStart) => {
          void navigate({
            to: ".",
            search: (prev) => ({ ...prev, weekStart }),
          });
        }}
      />
      <AdminLaborReport locationId={search.locationId} weekStart={search.weekStart} />
    </div>
  );
}
