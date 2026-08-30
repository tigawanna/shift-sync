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
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { adminWhoWorksWhereQueryOptions } from "../../-data-access-layer/admin-schedules.query-options";
import { WhoWorksListItem } from "./WhoWorksListItem";

const ROUTE_ID = "/_dashboard/admin/schedules/";
const routeApi = getRouteApi(ROUTE_ID);

function WhoWorksEmpty({
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
      <Empty data-test="who-works-search-empty">
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
    <Empty data-test="who-works-empty">
      <EmptyHeader>
        <EmptyTitle>No one is scheduled this week</EmptyTitle>
        <EmptyDescription>
          Assignments at every location for this Monday–Sunday week will show up here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function ListWhoWorks() {
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const page = search.page;
  const perPage = search.perPage;
  const sq = search.sq.trim();
  const hasSearch = sq.length > 0;

  const { data } = useSuspenseQuery(
    adminWhoWorksWhereQueryOptions({
      weekStart: search.weekStart,
      page,
      perPage,
      sq,
      locationId: search.locationId,
    }),
  );
  const { items, total, totalPages } = data;

  return (
    <div className="flex flex-col gap-4" data-test="who-works-list">
      <SearchBox
        keyword={inputValue}
        setKeyword={(value) => onSearchChange(value)}
        isDebouncing={isDebouncing}
        placeholder="Search people, locations, or skills"
      />
      {items.length === 0 ? (
        <WhoWorksEmpty hasSearch={hasSearch} query={sq} onClearSearch={clearSearch} />
      ) : (
        <>
          <p className="text-muted-foreground text-xs">{total} assignments this week</p>
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
