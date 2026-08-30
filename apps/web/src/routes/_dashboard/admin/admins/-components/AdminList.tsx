import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { LocationFilterSheet } from "@/components/picker/LocationFilterSheet";
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
import { listAdminsQueryOptions } from "../../-data-access-layer/admins.query-options";
import { AdminListItem } from "./AdminListItem";

const ROUTE_ID = "/_dashboard/admin/admins/";
const routeApi = getRouteApi(ROUTE_ID);

function AdminListEmpty({
  hasSearch,
  hasLocation,
  query,
  onClearSearch,
}: {
  hasSearch: boolean;
  hasLocation: boolean;
  query: string;
  onClearSearch: () => void;
}) {
  if (hasSearch) {
    return (
      <Empty
        data-test="admins-search-empty"
        className="flex h-full min-h-[70dvh] w-full flex-col items-center justify-center"
      >
        <EmptyHeader>
          <EmptyTitle>No results for “{query}”</EmptyTitle>
          <EmptyDescription>Try a different name or email address.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClearSearch}>
            Clear search
          </button>
        </EmptyContent>
      </Empty>
    );
  }

  if (hasLocation) {
    return (
      <Empty
        data-test="admins-location-empty"
        className="flex h-full min-h-[70dvh] w-full flex-col items-center justify-center"
      >
        <EmptyHeader>
          <EmptyTitle>No admins at this location</EmptyTitle>
          <EmptyDescription>
            Corporate admins are not assigned to restaurants, so this filter is usually empty.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Empty
      data-test="admins-empty"
      className="flex h-full min-h-[70dvh] w-full flex-col items-center justify-center"
    >
      <EmptyHeader>
        <EmptyTitle>No admins yet</EmptyTitle>
        <EmptyDescription>Admin accounts will show up here once they are created.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function AdminList() {
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const page = search.page;
  const perPage = search.perPage;
  const sq = search.sq.trim();
  const hasSearch = sq.length > 0;
  const locationId = search.locationId;

  const { data } = useSuspenseQuery(listAdminsQueryOptions({ page, perPage, sq, locationId }));
  const { items, total, totalPages } = data;

  return (
    <section className="flex h-full w-full flex-col gap-4" data-test="admin-admins-list">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          keyword={inputValue}
          setKeyword={(value) => onSearchChange(value)}
          isDebouncing={isDebouncing}
          placeholder="Search by name or email"
          className="w-56 max-w-full"
        />
        <LocationFilterSheet
          locationId={locationId}
          triggerLabel="Filters"
          showTimezone={false}
          description="Search restaurants. Admins are usually not assigned to a location."
          searchTestId="admin-admins-location-search"
          dataTest="admin-admins-location-filter"
          onSelect={(nextId) => {
            void navigate({
              to: ".",
              search: (prev) => ({ ...prev, locationId: nextId, page: 1 }),
              replace: true,
            });
          }}
        />
        <p className="text-muted-foreground ml-auto font-mono text-xs">
          {total} {total === 1 ? "person" : "people"}
        </p>
      </div>

      {items.length === 0 ? (
        <AdminListEmpty
          hasSearch={hasSearch}
          hasLocation={Boolean(locationId)}
          query={sq}
          onClearSearch={clearSearch}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border" data-test="admins-table">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase">
                  Name
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase">
                  Email
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase">
                  Joined
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((admin) => (
                <AdminListItem key={admin.id} admin={admin} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
    </section>
  );
}
