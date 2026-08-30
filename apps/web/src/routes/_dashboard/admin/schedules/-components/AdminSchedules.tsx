import { addDaysYmd } from "@/lib/time/zoned";
import { OnDutyNow } from "../../../-components/OnDutyNow";
import { adminOnDutyNowQueryOptions } from "../../-data-access-layer/admin-schedules.query-options";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminLaborReport } from "./AdminLaborReport";
import { AdminLocationWeeks } from "./AdminLocationWeeks";
import { ListWhoWorks } from "./ListWhoWorks";

const routeApi = getRouteApi("/_dashboard/admin/schedules/");

export function AdminSchedules() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const onDutyQuery = useQuery(adminOnDutyNowQueryOptions());

  const goWeek = (weekStart: string) => {
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, weekStart, page: undefined }),
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => goWeek(addDaysYmd(search.weekStart, -7))}
        >
          <ChevronLeft className="size-4" />
          Previous week
        </button>
        <p className="text-sm font-medium tabular-nums">Week of {search.weekStart}</p>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => goWeek(addDaysYmd(search.weekStart, 7))}
        >
          Next week
          <ChevronRight className="size-4" />
        </button>
      </div>

      <OnDutyNow query={onDutyQuery} />
      <AdminLocationWeeks />
      {search.locationId ? (
        <AdminLaborReport locationId={search.locationId} weekStart={search.weekStart} />
      ) : (
        <p className="text-muted-foreground text-sm">
          Select a location above to see overtime and fairness for that week.
        </p>
      )}
      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold">Who is working where</h3>
          <p className="text-muted-foreground text-xs">
            Every assignment this week, in that location’s timezone. Selecting a location filters
            this list.
          </p>
        </div>
        <ListWhoWorks />
      </section>
    </div>
  );
}
