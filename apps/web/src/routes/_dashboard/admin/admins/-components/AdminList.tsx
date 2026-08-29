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
import { listAdminsQueryOptions } from "../../-data-access-layer/admins.query-options";
import { AdminListItem } from "./AdminListItem";

const ROUTE_ID = "/_dashboard/admin/admins/";
const routeApi = getRouteApi(ROUTE_ID);

function AdminListEmpty({
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
      <Empty data-test="admins-search-empty" className="w-full h-full flex flex-col items-center justify-center min-h-[70dvh]">
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
    <Empty data-test="admins-empty" className="w-full h-full flex flex-col items-center justify-center min-h-[70dvh]">
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
  const page = search.page;
  const perPage = search.perPage;
  const sq = search.sq.trim();
  const hasSearch = sq.length > 0;

  const { data } = useSuspenseQuery(listAdminsQueryOptions({ page, perPage, sq }));
  const { items, total, totalPages } = data;

  return (
    <section className="flex h-full w-full flex-col gap-4" data-test="admin-admins-list">
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
        <AdminListEmpty hasSearch={hasSearch} query={sq} onClearSearch={clearSearch} />
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
