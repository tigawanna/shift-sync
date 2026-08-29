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
import { teamMembersQueryOptions } from "@/data-access-layer/team/team.queries";
import {
  DEFAULT_TEAM_MEMBER_SORT_BY,
  DEFAULT_TEAM_MEMBER_SORT_DIRECTION,
  type TeamMemberRole,
  type TeamMemberSortBy,
} from "@/data-access-layer/team/team.types";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { UsersTable } from "../../admin/users/-components/UsersTable";
import type { DashboardPersonTo } from "./person-routes";

type AdminMembersRouteId = "/_dashboard/admin/users/" | "/_dashboard/admin/managers/";

type ListAdminMembersProps = {
  routeId: AdminMembersRouteId;
  role: TeamMemberRole;
  memberTo: DashboardPersonTo;
  emptyTitle: string;
  emptyMessage: string;
  testId: string;
};

function defaultSortDirection(column: TeamMemberSortBy) {
  return column === "createdAt" ? "desc" : "asc";
}

export function ListAdminMembers({
  routeId,
  role,
  memberTo,
  emptyTitle,
  emptyMessage,
  testId,
}: ListAdminMembersProps) {
  const routeApi = getRouteApi(routeId);
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(routeId);
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
      role,
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
    memberTo,
    showRole: false,
    emptyTitle,
    emptyMessage,
  };

  function renderTable() {
    if (isPending) {
      return <UsersTable data={undefined} isLoading {...tableProps} />;
    }

    if (!members || members.length === 0) {
      if (hasSearch) {
        return (
          <Empty data-test="users-search-empty">
            <EmptyHeader>
              <EmptyTitle>No results for &ldquo;{q}&rdquo;</EmptyTitle>
              <EmptyDescription>Try a different name or email address.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearSearch}>
                Clear search
              </button>
            </EmptyContent>
          </Empty>
        );
      }

      return <UsersTable data={members} {...tableProps} />;
    }

    return <UsersTable data={members} {...tableProps} />;
  }

  return (
    <section className="flex h-full w-full flex-col gap-4" data-test={testId}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-base-content/60 font-mono text-xs">{isPending ? "…" : total} people</p>
        <SearchBox
          keyword={inputValue}
          setKeyword={(value) => onSearchChange(value)}
          isDebouncing={isDebouncing}
          placeholder="Search by name or email"
        />
      </div>
      {renderTable()}
      <TSRListPagination routeID={routeId} totalPages={totalPages} />
    </section>
  );
}
