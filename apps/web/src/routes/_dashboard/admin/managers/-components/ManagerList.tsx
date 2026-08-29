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
import { listManagersQueryOptions } from "../../-data-access-layer/managers.query-options";
import { ManagerListItem } from "./ManagerListItem";

const ROUTE_ID = "/_dashboard/admin/managers/";
const routeApi = getRouteApi(ROUTE_ID);

function ManagerListEmpty({
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
        data-test="managers-search-empty"
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
      data-test="managers-empty"
      className="flex h-full min-h-[70dvh] w-full flex-col items-center justify-center"
    >
      <EmptyHeader>
        <EmptyTitle>No managers yet</EmptyTitle>
        <EmptyDescription>
          Manager accounts will show up here once they are created.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function ManagerList() {
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const page = search.page ?? 1;
  const perPage = search.perPage;
  const sq = (search.sq ?? "").trim();
  const hasSearch = sq.length > 0;

  const { data } = useSuspenseQuery(listManagersQueryOptions({ page, perPage, sq }));
  const { items, total, totalPages } = data;

  return (
    <section className="flex h-full w-full flex-col gap-4" data-test="admin-managers-list">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-muted-foreground font-mono text-xs">
          {total} {total === 1 ? "person" : "people"}
        </p>
        <SearchBox
          keyword={inputValue}
          setKeyword={(value) => onSearchChange(value)}
          isDebouncing={isDebouncing}
          placeholder="Search by name or email"
        />
      </div>

      {items.length === 0 ? (
        <ManagerListEmpty hasSearch={hasSearch} query={sq} onClearSearch={clearSearch} />
      ) : (
        <div className="overflow-hidden rounded-xl border" data-test="managers-table">
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
                <TableHead className="text-muted-foreground px-4 py-3 text-xs font-medium tracking-wide uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((manager) => (
                <ManagerListItem key={manager.id} manager={manager} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
    </section>
  );
}
