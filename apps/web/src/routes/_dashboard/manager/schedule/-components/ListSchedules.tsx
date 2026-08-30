import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
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
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { listManagerSchedulesQueryOptions } from "../../-data-access-layer/manager-schedule.query-options";
import { ScheduleListItem } from "./ScheduleListItem";

const ROUTE_ID = "/_dashboard/manager/schedule/";
const routeApi = getRouteApi(ROUTE_ID);

function ScheduleListEmpty({
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
      <Empty
        data-test="schedules-search-empty"
        className="flex h-full min-h-[70dvh] w-full flex-col items-center justify-center"
      >
        <EmptyHeader>
          <EmptyTitle>No results for “{query}”</EmptyTitle>
          <EmptyDescription>Try a location name, week date, or published / draft.</EmptyDescription>
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
    <Empty
      data-test="schedules-empty"
      className="flex h-full min-h-[70dvh] w-full flex-col items-center justify-center"
    >
      <EmptyHeader>
        <EmptyTitle>No schedules yet</EmptyTitle>
        <EmptyDescription>
          Weeks with shifts at your locations will show up here. Open a week to edit, publish, or
          delete it.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function ListSchedules() {
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const page = search.page ?? 1;
  const perPage = search.perPage ?? ADMIN_LIST_PER_PAGE;
  const sq = (search.sq ?? "").trim();
  const hasSearch = sq.length > 0;

  const { data } = useSuspenseQuery(
    listManagerSchedulesQueryOptions({
      page,
      perPage,
      sq,
      locationId: search.locationId,
    }),
  );
  const { items, total, totalPages } = data;

  return (
    <section className="flex h-full w-full flex-col gap-4" data-test="manager-schedules-list">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-muted-foreground font-mono text-xs">
          {total} {total === 1 ? "schedule" : "schedules"}
        </p>
        <SearchBox
          keyword={inputValue}
          setKeyword={(value) => onSearchChange(value)}
          isDebouncing={isDebouncing}
          placeholder="Search by location or week"
        />
      </div>

      {items.length === 0 ? (
        <ScheduleListEmpty hasSearch={hasSearch} query={sq} onClearSearch={clearSearch} />
      ) : (
        <div className="overflow-hidden rounded-xl border" data-test="schedules-table">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase">
                  Location
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase">
                  Week
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase">
                  Status
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase">
                  Shifts
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase">
                  Timezone
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <ScheduleListItem key={`${item.locationId}:${item.weekStart}`} item={item} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
    </section>
  );
}
