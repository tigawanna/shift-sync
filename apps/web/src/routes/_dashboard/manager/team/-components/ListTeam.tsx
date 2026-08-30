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
import { myManagerLocationsQueryOptions } from "../../-data-access-layer/manager-locations.query-options";
import { listManagerTeamQueryOptions } from "../../-data-access-layer/manager-team.query-options";
import { TeamListItem } from "./TeamListItem";

const ROUTE_ID = "/_dashboard/manager/team/";
const routeApi = getRouteApi(ROUTE_ID);

function TeamListEmpty({
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
        data-test="team-search-empty"
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

  return (
    <Empty
      data-test="team-empty"
      className="flex h-full min-h-[70dvh] w-full flex-col items-center justify-center"
    >
      <EmptyHeader>
        <EmptyTitle>No team yet</EmptyTitle>
        <EmptyDescription>
          Staff show up here once an admin certifies them at a location you manage.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function ListTeam() {
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const page = search.page;
  const perPage = search.perPage;
  const sq = search.sq.trim();
  const hasSearch = sq.length > 0;

  const locationsQuery = useSuspenseQuery(myManagerLocationsQueryOptions());
  const { data } = useSuspenseQuery(
    listManagerTeamQueryOptions({
      page,
      perPage,
      sq,
      locationId: search.locationId,
    }),
  );
  const { items, total, totalPages } = data;

  return (
    <section className="flex h-full w-full flex-col gap-4" data-test="manager-team-list">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <p className="text-muted-foreground font-mono text-xs">
          {total} {total === 1 ? "person" : "people"}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground text-xs">Location</span>
            <select
              className="select-bordered select select-sm"
              value={search.locationId ?? ""}
              onChange={(event) => {
                const locationId = event.target.value || undefined;
                void navigate({
                  to: ".",
                  search: (prev) => ({ ...prev, locationId, page: undefined }),
                  replace: true,
                });
              }}
            >
              <option value="">All my locations</option>
              {locationsQuery.data.items.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <SearchBox
            keyword={inputValue}
            setKeyword={(value) => onSearchChange(value)}
            isDebouncing={isDebouncing}
            placeholder="Search by name or email"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <TeamListEmpty hasSearch={hasSearch} query={sq} onClearSearch={clearSearch} />
      ) : (
        <div className="overflow-hidden rounded-xl border" data-test="team-table">
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
                  Skills
                </TableHead>
                <TableHead className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase">
                  Locations
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((person) => (
                <TeamListItem key={person.id} person={person} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
    </section>
  );
}
