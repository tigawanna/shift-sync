import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { SearchBox } from "@/components/search/SearchBox";
import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { COVERAGE_STATUS } from "@/lib/schedule/coverage";
import { CoverageStatusBadge } from "@/routes/_dashboard/staff/-components/staff-coverage/CoverageStatusBadge";
import {
  coverageKindLabel,
  coverageShiftWhen,
} from "@/routes/_dashboard/staff/-components/staff-coverage/coverage-labels";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "sonner";
import { approveCoverage, rejectCoverage } from "../../-data-access-layer/manager-coverage.fn";
import { managerCoverageQueryOptions } from "../../-data-access-layer/manager-coverage.query-options";

const ROUTE_ID = "/_dashboard/manager/requests/";
const routeApi = getRouteApi(ROUTE_ID);

function emptyTitle(hasSearch: boolean, sq: string, status: "all" | "pending" | "resolved") {
  if (hasSearch) return `No results for “${sq}”`;
  if (status === "pending") return "No pending coverage";
  if (status === "resolved") return "No resolved coverage yet";
  return "No coverage requests";
}

function emptyDescription(hasSearch: boolean) {
  if (hasSearch) return "Try a location, skill, person, or status.";
  return "Swap and drop requests show up here after the other staff member accepts, or after someone picks up a drop. Approved and rejected items stay under Resolved.";
}

function closedByNote(status: string, resolvedByName: string | null) {
  if (!resolvedByName) return "";
  if (status === "approved") return ` · Approved by ${resolvedByName}`;
  if (status === "rejected") return ` · Rejected by ${resolvedByName}`;
  if (status === "withdrawn") return ` · Withdrawn by ${resolvedByName}`;
  return ` · Closed by ${resolvedByName}`;
}

export function ListCoverage() {
  const queryClient = useQueryClient();
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const page = search.page;
  const perPage = search.perPage;
  const sq = search.sq.trim();
  const status = search.status;
  const hasSearch = sq.length > 0;

  const { data } = useSuspenseQuery(managerCoverageQueryOptions({ page, perPage, sq, status }));
  const { items, total, totalPages, pendingCount } = data;

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["manager-coverage"] });
    await queryClient.invalidateQueries({ queryKey: ["manager-week"] });
    await queryClient.invalidateQueries({ queryKey: ["staff-schedule"] });
    await queryClient.invalidateQueries({ queryKey: ["staff-coverage"] });
    await queryClient.invalidateQueries({ queryKey: ["staff-coverage-requests"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-audit"] });
    await queryClient.invalidateQueries({ queryKey: ["manager-shift-audit"] });
  };

  const approve = useMutation({
    mutationFn: approveCoverage,
    onSuccess: async () => {
      await invalidate();
      toast.success("Approved. The roster is updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not approve.");
    },
  });

  const reject = useMutation({
    mutationFn: rejectCoverage,
    onSuccess: async () => {
      await invalidate();
      toast.success("Rejected. Original assignment stands.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not reject.");
    },
  });

  return (
    <section className="flex h-full w-full flex-col gap-4" data-test="manager-coverage-list">
      <p className="text-muted-foreground text-sm">
        {pendingCount === 0
          ? "Nothing waiting on you. Open Resolved to review past approvals and rejections."
          : `${pendingCount} ${pendingCount === 1 ? "request needs" : "requests need"} your approval.`}
      </p>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <p className="text-muted-foreground font-mono text-xs">
          {total} {total === 1 ? "request" : "requests"}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-1">
            {(
              [
                ["all", "All"],
                ["pending", "Pending"],
                ["resolved", "Resolved"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={status === value ? "default" : "outline"}
                onClick={() => {
                  void navigate({
                    to: ".",
                    search: (prev) => ({ ...prev, status: value, page: undefined }),
                    replace: true,
                  });
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <SearchBox
            keyword={inputValue}
            setKeyword={(value) => onSearchChange(value)}
            isDebouncing={isDebouncing}
            placeholder="Search location, skill, or person"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <Empty className="min-h-[40dvh]">
          <EmptyHeader>
            <EmptyTitle>{emptyTitle(hasSearch, sq, status)}</EmptyTitle>
            <EmptyDescription>{emptyDescription(hasSearch)}</EmptyDescription>
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
        <ul className="flex flex-col gap-3">
          {items.map((row) => {
            const awaitingManager = row.request.status === COVERAGE_STATUS.pending_manager;
            return (
              <li
                key={row.request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <CoverageStatusBadge status={row.request.status} audience="manager" />
                    <span>
                      {coverageKindLabel(row.request.kind)} · {row.locationName}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {row.fromName}
                    {row.toName ? ` → ${row.toName}` : " · unclaimed"} · {row.skillName} ·{" "}
                    {coverageShiftWhen(row.shift.startsAt, row.shift.endsAt, row.locationTimezone)}
                    {closedByNote(row.request.status, row.resolvedByName)}
                  </p>
                </div>
                {awaitingManager ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => approve.mutate({ data: { requestId: row.request.id } })}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => reject.mutate({ data: { requestId: row.request.id } })}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
    </section>
  );
}
