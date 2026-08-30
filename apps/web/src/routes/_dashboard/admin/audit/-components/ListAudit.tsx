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
import { exportAdminAudit } from "../../-data-access-layer/admin-audit.fn";
import { listAdminAuditQueryOptions } from "../../-data-access-layer/admin-audit.query-options";
import { locationOptionsQueryOptions } from "../../-data-access-layer/locations.query-options";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuditListItem } from "./AuditListItem";

const ROUTE_ID = "/_dashboard/admin/audit/";
const routeApi = getRouteApi(ROUTE_ID);

export function ListAudit() {
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const locationsQuery = useSuspenseQuery(locationOptionsQueryOptions());
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

  const exportCsv = useMutation({
    mutationFn: () =>
      exportAdminAudit({
        data: {
          sq: search.sq,
          locationId: search.locationId,
          from: search.from,
          to: search.to,
        },
      }),
    onSuccess: (csv) => {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-${search.from}-to-${search.to}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Audit export downloaded.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not export.");
    },
  });

  return (
    <div className="flex flex-col gap-4" data-test="admin-audit-list">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <p className="text-muted-foreground font-mono text-xs">{total} events</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground text-xs">From</span>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={search.from}
              onChange={(event) =>
                void navigate({
                  to: ".",
                  search: (prev) => ({ ...prev, from: event.target.value, page: undefined }),
                  replace: true,
                })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground text-xs">To</span>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={search.to}
              onChange={(event) =>
                void navigate({
                  to: ".",
                  search: (prev) => ({ ...prev, to: event.target.value, page: undefined }),
                  replace: true,
                })
              }
            />
          </label>
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
              <option value="">All locations</option>
              {locationsQuery.data.map((location) => (
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
            placeholder="Search action, person, location"
          />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={exportCsv.isPending}
            onClick={() => exportCsv.mutate()}
          >
            Export CSV
          </button>
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
