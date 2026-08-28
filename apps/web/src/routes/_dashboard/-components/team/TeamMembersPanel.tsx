import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { teamMembersQueryOptions } from "@/data-access-layer/team/team.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useSearch as useRouteSearch, type RegisteredRouter, type RouteIds } from "@tanstack/react-router";
import { TeamMembersTable } from "./TeamMembersTable";

type ListRouteId = RouteIds<RegisteredRouter["routeTree"]>;

type TeamMembersPanelProps = {
  routeId: ListRouteId;
  emptyMessage: string;
  searchPlaceholder?: string;
};

export function TeamMembersPanel({
  routeId,
  emptyMessage,
  searchPlaceholder = "Search by name or email",
}: TeamMembersPanelProps) {
  const routeSearch = useRouteSearch({ from: routeId as never }) as { page?: number };
  const search = usePageSearchQuery(routeId);
  const page = routeSearch.page ?? 1;

  const membersQuery = useSuspenseQuery(
    teamMembersQueryOptions({
      page,
      search: search.committedQ || undefined,
    }),
  );

  const { members, total, totalPages } = membersQuery.data;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-base-content/60 font-mono text-xs">{total} people</p>
        <label className="flex w-full flex-col gap-1 text-sm sm:max-w-xs">
          <span className="text-base-content/60 text-xs">Search</span>
          <div className="flex gap-2">
            <input
              type="search"
              value={search.inputValue}
              onChange={(event) => search.onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="input-bordered input w-full"
            />
            {search.committedQ ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={search.clearSearch}>
                Clear
              </button>
            ) : null}
          </div>
        </label>
      </div>

      <TeamMembersTable members={members} emptyMessage={emptyMessage} />
      <TSRListPagination routeID={routeId} totalPages={totalPages} />
    </section>
  );
}
