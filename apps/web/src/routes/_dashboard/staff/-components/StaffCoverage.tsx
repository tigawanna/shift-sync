import { Button } from "@/components/ui/button";
import type { StaffScheduleShift } from "@/routes/_dashboard/staff/-data-access-layer/staff-schedule.fn";
import {
  acceptIncomingSwap,
  declineIncomingSwap,
  pickupDrop,
  requestDrop,
  requestSwap,
  withdrawCoverage,
} from "@/routes/_dashboard/staff/-data-access-layer/staff-coverage.fn";
import {
  myCoverageQueryOptions,
  swapCandidatesQueryOptions,
} from "@/routes/_dashboard/staff/-data-access-layer/staff-coverage.query-options";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { shiftTimeLabel } from "./staff-schedule/staff-schedule.spans";

function isWithdrawable(status: string) {
  return status === "open" || status === "pending_peer" || status === "pending_manager";
}

function useCoverageMutations() {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["staff-coverage"] });
    await queryClient.invalidateQueries({ queryKey: ["staff-schedule"] });
  };

  const onError = (error: unknown) => {
    toast.error(error instanceof Error ? error.message : "Could not update coverage.");
  };

  return {
    drop: useMutation({
      mutationFn: requestDrop,
      onSuccess: async () => {
        await invalidate();
        toast.success("Drop offered. You stay on the shift until a manager approves a pickup.");
      },
      onError,
    }),
    swap: useMutation({
      mutationFn: requestSwap,
      onSuccess: async () => {
        await invalidate();
        toast.success("Swap sent. You stay on the shift until a manager approves.");
      },
      onError,
    }),
    pickup: useMutation({
      mutationFn: pickupDrop,
      onSuccess: async () => {
        await invalidate();
        toast.success("Pickup is waiting on a manager.");
      },
      onError,
    }),
    accept: useMutation({
      mutationFn: acceptIncomingSwap,
      onSuccess: async () => {
        await invalidate();
        toast.success("Accepted. A manager still has to approve.");
      },
      onError,
    }),
    decline: useMutation({
      mutationFn: declineIncomingSwap,
      onSuccess: async () => {
        await invalidate();
        toast.success("Swap declined.");
      },
      onError,
    }),
    withdraw: useMutation({
      mutationFn: withdrawCoverage,
      onSuccess: async () => {
        await invalidate();
        toast.success("Request withdrawn.");
      },
      onError,
    }),
  };
}

function SwapPicker({
  shiftId,
  onPick,
  pending,
}: {
  shiftId: string;
  onPick: (toUserId: string) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const candidates = useQuery({
    ...swapCandidatesQueryOptions(shiftId),
    enabled: open,
  });

  if (!open) {
    return (
      <Button type="button" size="xs" variant="outline" onClick={() => setOpen(true)}>
        Swap…
      </Button>
    );
  }

  if (candidates.isPending) {
    return <p className="text-muted-foreground text-xs">Loading people…</p>;
  }

  if (!candidates.data || candidates.data.items.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        No other qualified staff.
        <button type="button" className="link ml-1" onClick={() => setOpen(false)}>
          Close
        </button>
      </p>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">Swap with</span>
      <select
        className="border-input bg-background h-7 rounded-md border px-1"
        defaultValue=""
        disabled={pending}
        onChange={(event) => {
          const toUserId = event.target.value;
          if (toUserId) onPick(toUserId);
        }}
      >
        <option value="">Choose someone</option>
        {candidates.data.items.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StaffCoverage({ shifts }: { shifts: StaffScheduleShift[] }) {
  const coverageQuery = useQuery(myCoverageQueryOptions());
  const mutations = useCoverageMutations();
  const data = coverageQuery.data;
  const pendingIds = new Set(
    (data?.mine ?? [])
      .filter(
        (row) =>
          row.request.status === "open" ||
          row.request.status === "pending_peer" ||
          row.request.status === "pending_manager",
      )
      .map((row) => row.request.shiftId),
  );

  return (
    <section className="flex flex-col gap-4" data-test="staff-coverage">
      <div>
        <h3 className="text-sm font-semibold">Coverage</h3>
        <p className="text-muted-foreground text-xs">
          Swap or drop a published shift. The roster does not change until a manager approves. Max 3
          pending requests. Unclaimed drops expire 24 hours before the shift.
        </p>
      </div>

      {coverageQuery.isPending ? (
        <p className="text-muted-foreground text-sm">Loading coverage…</p>
      ) : null}

      {data && data.incoming.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide uppercase">Incoming swaps</p>
          {data.incoming.map((row) => (
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

      {data && data.openDrops.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide uppercase">Open drops</p>
          {data.openDrops.map((row) => (
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

      {data && data.mine.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide uppercase">Your requests</p>
          {data.mine.map((row) => (
            <div
              key={row.request.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <p className="text-sm">
                {row.request.kind} · {row.request.status} · {row.locationName}
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

      {shifts.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide uppercase">Your published shifts</p>
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
            >
              <div>
                <p className="text-sm font-medium">{shift.locationName}</p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {shift.startDate} · {shiftTimeLabel(shift)} · {shift.skillName}
                </p>
              </div>
              {pendingIds.has(shift.id) ? (
                <p className="text-muted-foreground text-xs">Pending</p>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => mutations.drop.mutate({ data: { shiftId: shift.id } })}
                  >
                    Drop
                  </Button>
                  <SwapPicker
                    shiftId={shift.id}
                    pending={mutations.swap.isPending}
                    onPick={(toUserId) =>
                      mutations.swap.mutate({ data: { shiftId: shift.id, toUserId } })
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
