import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { SearchBox } from "@/components/search/SearchBox";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { teamMembersQueryOptions } from "@/data-access-layer/team/team.queries";
import {
  DEFAULT_TEAM_MEMBER_SORT_BY,
  DEFAULT_TEAM_MEMBER_SORT_DIRECTION,
  type TeamMemberSortBy,
} from "@/data-access-layer/team/team.types";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { UsersTable } from "./UsersTable";

const ROUTE_ID = "/_dashboard/admin/users/";
const routeApi = getRouteApi(ROUTE_ID);

function defaultSortDirection(column: TeamMemberSortBy) {
  return column === "createdAt" ? "desc" : "asc";
}

function UsersSearchEmpty({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <Empty data-test="users-search-empty">
      <EmptyHeader>
        <EmptyTitle>No results for &ldquo;{query}&rdquo;</EmptyTitle>
        <EmptyDescription>Try a different name or email address.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          Clear search
        </button>
      </EmptyContent>
    </Empty>
  );
}

export function ListUsers() {
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const page = search.page ?? 1;
  const q = (search.q ?? "").trim();
  const hasSearch = q.length > 0;
  const sortBy = search.sortBy ?? DEFAULT_TEAM_MEMBER_SORT_BY;
  const sortDirection = search.sortDirection ?? DEFAULT_TEAM_MEMBER_SORT_DIRECTION;

  const { data, isPending } = useQuery(
    teamMembersQueryOptions({
      page,
      search: q || undefined,
      sortBy,
      sortDirection,
    }),
  );

  const members = data?.members;
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  function onSort(column: TeamMemberSortBy) {
    const nextDirection =
      sortBy === column ? (sortDirection === "asc" ? "desc" : "asc") : defaultSortDirection(column);

    void navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        sortBy:
          column === DEFAULT_TEAM_MEMBER_SORT_BY &&
          nextDirection === DEFAULT_TEAM_MEMBER_SORT_DIRECTION
            ? undefined
            : column,
        sortDirection:
          column === DEFAULT_TEAM_MEMBER_SORT_BY &&
          nextDirection === DEFAULT_TEAM_MEMBER_SORT_DIRECTION
            ? undefined
            : nextDirection,
        page: undefined,
      }),
      replace: true,
    });
  }

  const tableProps = {
    sortBy,
    sortDirection,
    onSort,
  };

  function renderTable() {
    if (isPending) {
      return <UsersTable data={undefined} isLoading {...tableProps} />;
    }

    if (!members || members.length === 0) {
      if (hasSearch) {
        return <UsersSearchEmpty query={q} onClear={clearSearch} />;
      }

      return <UsersTable data={members} {...tableProps} />;
    }

    return <UsersTable data={members} {...tableProps} />;
  }

  return (
    <section className="flex h-full w-full flex-col gap-4" data-test="admin-users-list">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-base-content/60 font-mono text-xs">
          {isPending ? "…" : total} people
        </p>
        <SearchBox
          keyword={inputValue}
          setKeyword={(value) => onSearchChange(value)}
          isDebouncing={isDebouncing}
          placeholder="Search by name or email"
        />
      </div>
      {renderTable()}
      <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
    </section>
  );
}
