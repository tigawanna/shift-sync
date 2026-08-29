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
import { listLocationsQueryOptions } from "../../-data-access-layer/locations.query-options";
import { LocationListItem } from "./LocationListItem";

const ROUTE_ID = "/_dashboard/admin/locations/";
const routeApi = getRouteApi(ROUTE_ID);

function LocationListEmpty({
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
        data-test="locations-search-empty"
        className="flex h-full min-h-[70dvh] w-full flex-col items-center justify-center"
      >
        <EmptyHeader>
          <EmptyTitle>No results for “{query}”</EmptyTitle>
          <EmptyDescription>Try a different name or address.</EmptyDescription>
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
      data-test="locations-empty"
      className="flex h-full min-h-[70dvh] w-full flex-col items-center justify-center"
    >
      <EmptyHeader>
        <EmptyTitle>No locations yet</EmptyTitle>
        <EmptyDescription>Restaurants will show up here once they are added.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function LocationList() {
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const page = search.page ?? 1;
  const perPage = search.perPage;
  const sq = (search.sq ?? "").trim();
  const hasSearch = sq.length > 0;

  const { data } = useSuspenseQuery(listLocationsQueryOptions({ page, perPage, sq }));
  const { items, total, totalPages } = data;

  return (
    <section className="flex h-full w-full flex-col gap-4" data-test="admin-locations-list">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-muted-foreground font-mono text-xs">
          {total} {total === 1 ? "location" : "locations"}
        </p>
        <SearchBox
          keyword={inputValue}
          setKeyword={(value) => onSearchChange(value)}
          isDebouncing={isDebouncing}
          placeholder="Search by name or address"
        />
      </div>

      {items.length === 0 ? (
        <LocationListEmpty hasSearch={hasSearch} query={sq} onClearSearch={clearSearch} />
      ) : (
        <div className="overflow-hidden rounded-xl border" data-test="locations-table">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase">
                  Location
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase">
                  Timezone
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase">
                  Added
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((location) => (
                <LocationListItem key={location.id} location={location} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
    </section>
  );
}
