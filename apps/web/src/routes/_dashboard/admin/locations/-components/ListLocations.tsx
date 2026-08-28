import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { SearchBox } from "@/components/search/SearchBox";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { locationsQueryOptions } from "@/data-access-layer/location/location.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { LocationsTable } from "../../../-components/location/LocationsTable";

const ROUTE_ID = "/_dashboard/admin/locations/";
const routeApi = getRouteApi(ROUTE_ID);

export function ListLocations() {
  const { inputValue, onSearchChange, isDebouncing } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const page = search.page ?? 1;
  const q = (search.q ?? "").trim();

  const { data } = useSuspenseQuery(
    locationsQueryOptions({
      page,
      search: q || undefined,
    }),
  );

  const { locations, total, totalPages } = data;

  return (
    <section className="flex h-full w-full flex-col gap-4" data-test="admin-locations-list">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-base-content/60 font-mono text-xs">{total} locations</p>
        <SearchBox
          keyword={inputValue}
          setKeyword={(value) => onSearchChange(value)}
          isDebouncing={isDebouncing}
          placeholder="Search by name or address"
        />
      </div>
      <LocationsTable
        locations={locations}
        emptyMessage="No locations yet. Add the first Coastal Eats restaurant to get started."
      />
      <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
    </section>
  );
}
