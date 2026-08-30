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
import { useViewer } from "@/data-access-layer/auth/viewer";
import { COVERAGE_PENDING_LIMIT } from "@/lib/schedule/coverage";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useCoverageMutations } from "../../-components/staff-coverage/useCoverageMutations";
import { CoverageStatusBadge } from "../../-components/staff-coverage/CoverageStatusBadge";
import {
  coverageKindLabel,
  coverageShiftWhen,
} from "../../-components/staff-coverage/coverage-labels";
import {
  myCoverageQueryOptions,
  myCoverageRequestsQueryOptions,
} from "../../-data-access-layer/staff-coverage.query-options";

const ROUTE_ID = "/_dashboard/staff/coverage/";
const routeApi = getRouteApi(ROUTE_ID);

function isWithdrawable(status: string) {
  return status === "open" || status === "pending_peer" || status === "pending_manager";
}

export function ListStaffCoverage() {
  const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(ROUTE_ID);
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const page = search.page;
  const perPage = search.perPage;
  const sq = search.sq.trim();
  const status = search.status;
  const hasSearch = sq.length > 0;
  const mutations = useCoverageMutations();
  const { viewer } = useViewer();
  const myUserId = viewer.user?.id;

  const inbox = useSuspenseQuery(myCoverageQueryOptions());
  const history = useSuspenseQuery(myCoverageRequestsQueryOptions({ page, perPage, sq, status }));

  const incoming = inbox.data.incoming;
  const openDrops = inbox.data.openDrops;
  const pendingCount = inbox.data.pendingCount;
  const { items, total, totalPages } = history.data;

  return (
    <section className="flex h-full w-full flex-col gap-8" data-test="staff-coverage-list">
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">
          {pendingCount}/{COVERAGE_PENDING_LIMIT} of your own requests are still pending. Start a
          swap or drop from the calendar.
        </p>
      </div>

      {incoming.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-xs font-medium tracking-wide uppercase">Incoming swaps</p>
            <p className="text-muted-foreground text-xs">
              Accept sends this to a manager. You stay off the roster until they approve. Withdraw
              or decline closes the request (resolved).
            </p>
          </div>
          {incoming.map((row) => (
            <div
              key={row.request.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  <CoverageStatusBadge status={row.request.status} />
                  <span>
                    {row.fromName} wants to swap · {row.locationName}
                  </span>
                </p>
                <p className="text-muted-foreground text-sm">
                  {row.skillName} ·{" "}
                  {coverageShiftWhen(row.shift.startsAt, row.shift.endsAt, row.locationTimezone)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => mutations.accept.mutate({ data: { requestId: row.request.id } })}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => mutations.decline.mutate({ data: { requestId: row.request.id } })}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {openDrops.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide uppercase">Open drops</p>
          {openDrops.map((row) => (
            <div
              key={row.request.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div>
                <p className="font-medium">
                  {row.fromName} dropped · {row.locationName}
                </p>
                <p className="text-muted-foreground text-sm">
                  {row.skillName} ·{" "}
                  {coverageShiftWhen(row.shift.startsAt, row.shift.endsAt, row.locationTimezone)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => mutations.pickup.mutate({ data: { requestId: row.request.id } })}
              >
                Pick up
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
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
          <Empty data-test="coverage-empty" className="min-h-[40dvh]">
            <EmptyHeader>
              <EmptyTitle>
                {hasSearch
                  ? `No results for “${sq}”`
                  : status === "pending"
                    ? "No pending requests"
                    : "No swap or drop requests"}
              </EmptyTitle>
              <EmptyDescription>
                {hasSearch
                  ? "Try a location, skill, teammate, or status."
                  : "Swap or drop from a published shift on your calendar. Incoming swaps and open drops show up here."}
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
          <ul className="flex flex-col gap-3">
            {items.map((row) => (
              <li
                key={row.request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <CoverageStatusBadge status={row.request.status} />
                    <span>
                      {coverageKindLabel(row.request.kind)} · {row.locationName}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {row.fromName}
                    {row.toName ? ` → ${row.toName}` : ""} · {row.skillName} ·{" "}
                    {coverageShiftWhen(row.shift.startsAt, row.shift.endsAt, row.locationTimezone)}
                  </p>
                </div>
                {myUserId === row.request.fromUserId && isWithdrawable(row.request.status) ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      mutations.withdraw.mutate({ data: { requestId: row.request.id } })
                    }
                  >
                    Withdraw
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
      </div>
    </section>
  );
}
