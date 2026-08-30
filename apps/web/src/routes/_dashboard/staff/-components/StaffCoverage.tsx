import { Button } from "@/components/ui/button";
import { COVERAGE_PENDING_LIMIT } from "@/lib/schedule/coverage";
import { myCoverageQueryOptions } from "@/routes/_dashboard/staff/-data-access-layer/staff-coverage.query-options";
import { useQuery } from "@tanstack/react-query";
import { useCoverageMutations } from "./staff-coverage/useCoverageMutations";

function isWithdrawable(status: string) {
  return status === "open" || status === "pending_peer" || status === "pending_manager";
}

function statusLabel(status: string) {
  if (status === "pending_peer") return "Waiting on teammate";
  if (status === "pending_manager") return "Waiting on manager";
  if (status === "open") return "Open drop";
  return status;
}

export function StaffCoverage() {
  const coverageQuery = useQuery(myCoverageQueryOptions());
  const mutations = useCoverageMutations();
  const data = coverageQuery.data;
  const incoming = data?.incoming ?? [];
  const openDrops = data?.openDrops ?? [];
  const mine = data?.mine ?? [];
  const pendingCount = mine.filter((row) => isWithdrawable(row.request.status)).length;

  if (coverageQuery.isPending) {
    return (
      <section className="flex flex-col gap-2" data-test="staff-coverage">
        <p className="text-muted-foreground text-sm">Loading coverage…</p>
      </section>
    );
  }

  if (incoming.length === 0 && openDrops.length === 0 && mine.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4" data-test="staff-coverage">
      <div>
        <h3 className="text-sm font-semibold">Coverage</h3>
        <p className="text-muted-foreground text-xs">
          Incoming swaps, open drops, and your requests. Swap or drop from the calendar.{" "}
          {pendingCount}/{COVERAGE_PENDING_LIMIT} pending.
        </p>
      </div>

      {incoming.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide uppercase">Incoming swaps</p>
          {incoming.map((row) => (
            <div
              key={row.request.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <p className="text-sm">
                {row.fromName} wants to swap {row.locationName} · {row.skillName}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="xs"
                  onClick={() => mutations.accept.mutate({ data: { requestId: row.request.id } })}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  size="xs"
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
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <p className="text-sm">
                {row.fromName} dropped {row.locationName} · {row.skillName}
              </p>
              <Button
                type="button"
                size="xs"
                onClick={() => mutations.pickup.mutate({ data: { requestId: row.request.id } })}
              >
                Pick up
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {mine.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide uppercase">Your requests</p>
          {mine.map((row) => (
            <div
              key={row.request.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <p className="text-sm">
                {row.request.kind === "swap" ? "Swap" : "Drop"} · {statusLabel(row.request.status)}{" "}
                · {row.locationName}
              </p>
              {isWithdrawable(row.request.status) ? (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => mutations.withdraw.mutate({ data: { requestId: row.request.id } })}
                >
                  Withdraw
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
