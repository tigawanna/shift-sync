import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { SearchBox } from "@/components/search/SearchBox";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { teamMembersQueryOptions } from "@/data-access-layer/team/team.queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { TeamMembersTable } from "../../../-components/team/TeamMembersTable";

const ROUTE_ID = "/_dashboard/manager/team/";
const routeApi = getRouteApi(ROUTE_ID);

export function ListTeamMembers() {
  const { inputValue, onSearchChange, isDebouncing } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const page = search.page ?? 1;
  const q = (search.q ?? "").trim();

  const { data } = useSuspenseQuery(
    teamMembersQueryOptions({
      page,
      search: q || undefined,
    }),
  );

  const { members, total, totalPages } = data;

  return (
    <section className="flex h-full w-full flex-col gap-4" data-test="manager-team-list">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-base-content/60 font-mono text-xs">{total} people</p>
        <SearchBox
          keyword={inputValue}
          setKeyword={(value) => onSearchChange(value)}
          isDebouncing={isDebouncing}
          placeholder="Search by name or email"
        />
      </div>
      <TeamMembersTable
        members={members}
        emptyMessage="No staff accounts yet. Ask an admin to create staff users."
        showImpersonate
        memberTo="/manager/team/$userId"
      />
      <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
    </section>
  );
}
