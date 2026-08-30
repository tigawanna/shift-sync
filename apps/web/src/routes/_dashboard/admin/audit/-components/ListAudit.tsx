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
import { listAdminAuditQueryOptions } from "../../-data-access-layer/admin-audit.query-options";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { AuditExportButton, AuditFilters } from "./AuditFilters";
import { AuditListItem } from "./AuditListItem";

const ROUTE_ID = "/_dashboard/admin/audit/";
const routeApi = getRouteApi(ROUTE_ID);

export function ListAudit() {
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const { data } = useSuspenseQuery(
    listAdminAuditQueryOptions({
      page: search.page,
      perPage: search.perPage,
      sq: search.sq.trim(),
      locationId: search.locationId,
      from: search.from,
      to: search.to,
    }),
  );
  const { items, total, totalPages } = data;
  const hasSearch = search.sq.trim().length > 0;

  return (
    <div className="flex flex-col gap-4" data-test="admin-audit-list">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          keyword={inputValue}
          setKeyword={(value) => onSearchChange(value)}
          isDebouncing={isDebouncing}
          placeholder="Search action, person, location"
          className="w-56 max-w-full"
        />
        <p className="text-muted-foreground font-mono text-xs">{total} events</p>
        <div className="ml-auto flex items-center gap-2">
          <AuditFilters />
          <AuditExportButton />
        </div>
      </div>

      {items.length === 0 ? (
        <Empty data-test="audit-empty">
          <EmptyHeader>
            <EmptyTitle>
              {hasSearch ? `No results for “${search.sq.trim()}”` : "No audit events"}
            </EmptyTitle>
            <EmptyDescription>
              {hasSearch
                ? "Try a different person, action, or location."
                : "Schedule writes will show up here with who, when, before, and after."}
            </EmptyDescription>
          </EmptyHeader>
          {hasSearch ? (
            <EmptyContent>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearSearch}>
                Clear search
              </button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-left text-xs tracking-wide uppercase">
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Who</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Location</th>
                  <th className="px-3 py-2 font-medium">Shift</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <AuditListItem key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
          <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
