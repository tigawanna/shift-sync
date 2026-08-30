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
import { mondayOfWeekContaining } from "@/lib/time/zoned";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { listManagerSchedulesQueryOptions } from "../../../-data-access-layer/manager-schedule.query-options";
import { ScheduleListItem } from "../../-components/ScheduleListItem";

const ROUTE_ID = "/_dashboard/manager/schedule/$locationId/";
const routeApi = getRouteApi(ROUTE_ID);

export function ListLocationSchedules({
  locationId,
  timezone,
}: {
  locationId: string;
  timezone: string;
}) {
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const page = search.page ?? 1;
  const perPage = search.perPage ?? ADMIN_LIST_PER_PAGE;
  const sq = (search.sq ?? "").trim();
  const hasSearch = sq.length > 0;
  const currentWeek = mondayOfWeekContaining(new Date(), timezone);

  const { data } = useSuspenseQuery(
    listManagerSchedulesQueryOptions({
      page,
      perPage,
      sq,
      locationId,
    }),
  );
  const { items, total, totalPages } = data;

  if (items.length === 0) {
    if (hasSearch) {
      return (
        <section className="flex flex-col gap-4" data-test="manager-location-schedules-list">
          <SearchBox
            keyword={inputValue}
            setKeyword={(value) => onSearchChange(value)}
            isDebouncing={isDebouncing}
            placeholder="Search by week"
          />
          <Empty
            data-test="location-schedules-search-empty"
            className="flex min-h-[50dvh] w-full flex-col items-center justify-center"
          >
            <EmptyHeader>
              <EmptyTitle>No results for “{sq}”</EmptyTitle>
              <EmptyDescription>Try a different week date or published / draft.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearSearch}>
                Clear search
              </button>
            </EmptyContent>
          </Empty>
        </section>
      );
    }

    return (
      <Empty
        data-test="location-schedules-empty"
        className="flex min-h-[50dvh] w-full flex-col items-center justify-center"
      >
        <EmptyHeader>
          <EmptyTitle>No weeks yet</EmptyTitle>
          <EmptyDescription>
            Open the current week to add shifts, then publish when staff should see them.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            to="/manager/schedule/$locationId/$weekStart"
            params={{ locationId, weekStart: currentWeek }}
            className="btn btn-primary btn-sm"
          >
            Open current week
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <section
      className="flex h-full w-full flex-col gap-4"
      data-test="manager-location-schedules-list"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-muted-foreground font-mono text-xs">
          {total} {total === 1 ? "schedule" : "schedules"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox
            keyword={inputValue}
            setKeyword={(value) => onSearchChange(value)}
            isDebouncing={isDebouncing}
            placeholder="Search by week"
          />
          <Link
            to="/manager/schedule/$locationId/$weekStart"
            params={{ locationId, weekStart: currentWeek }}
            className="btn btn-outline btn-sm"
          >
            Current week
          </Link>
        </div>
      </div>

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

      <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
    </section>
  );
}
