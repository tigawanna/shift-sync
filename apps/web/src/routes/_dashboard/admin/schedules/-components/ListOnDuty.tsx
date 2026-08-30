import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { SearchBox } from "@/components/search/SearchBox";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { adminOnDutyNowQueryOptions } from "../../-data-access-layer/admin-schedules.query-options";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { WhoWorksListItem } from "./WhoWorksListItem";

const ROUTE_ID = "/_dashboard/admin/schedules/on-duty";
const routeApi = getRouteApi(ROUTE_ID);

function OnDutyEmpty({
  hasSearch,
  query,
  onClearSearch,
}: {
  hasSearch: boolean;
  query: string;
  onClearSearch: () => void;
}) {
  if (hasSearch) {
    return (
      <Empty data-test="on-duty-search-empty">
        <EmptyHeader>
          <EmptyTitle>No results for “{query}”</EmptyTitle>
          <EmptyDescription>Try a person, location, or skill.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClearSearch}>
            Clear search
          </button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty data-test="on-duty-empty">
      <EmptyHeader>
        <EmptyTitle>Nobody is on a shift right now</EmptyTitle>
        <EmptyDescription>
          People whose shift is in progress will show up here. The list refreshes every 15 seconds.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function ListOnDuty() {
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const page = search.page;
  const perPage = search.perPage;
  const sq = search.sq.trim();
  const hasSearch = sq.length > 0;

  const { data } = useSuspenseQuery(
    adminOnDutyNowQueryOptions({
      page,
      perPage,
      sq,
      locationId: search.locationId,
    }),
  );
  const { items, total, totalPages } = data;

  return (
    <div className="flex flex-col gap-4" data-test="on-duty-now">
      <div>
        <h3 className="text-sm font-semibold">On duty now</h3>
        <p className="text-muted-foreground text-xs">
          Assignments whose shift is in progress. Refreshes every 15 seconds.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <p className="text-muted-foreground text-xs">
          {`${total} people on a shift right now${search.locationId ? " at this location" : ""}.`}
        </p>
        <SearchBox
          keyword={inputValue}
          setKeyword={(value) => onSearchChange(value)}
          isDebouncing={isDebouncing}
          placeholder="Search people or skills"
        />
      </div>
      {items.length === 0 ? (
        <OnDutyEmpty hasSearch={hasSearch} query={sq} onClearSearch={clearSearch} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-left text-xs tracking-wide uppercase">
                  <th className="px-3 py-2 font-medium">Person</th>
                  <th className="px-3 py-2 font-medium">Location</th>
                  <th className="px-3 py-2 font-medium">Skill</th>
                  <th className="px-3 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <WhoWorksListItem key={item.assignmentId} item={item} />
                ))}
              </tbody>
            </table>
          </div>
          <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
