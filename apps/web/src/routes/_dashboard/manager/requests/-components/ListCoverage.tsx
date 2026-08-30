import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { approveCoverage, rejectCoverage } from "../../-data-access-layer/manager-coverage.fn";
import { managerCoverageQueryOptions } from "../../-data-access-layer/manager-coverage.query-options";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export function ListCoverage() {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(managerCoverageQueryOptions());

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["manager-coverage"] });
    await queryClient.invalidateQueries({ queryKey: ["manager-week"] });
    await queryClient.invalidateQueries({ queryKey: ["staff-schedule"] });
    await queryClient.invalidateQueries({ queryKey: ["staff-coverage"] });
    await queryClient.invalidateQueries({ queryKey: ["staff-coverage-requests"] });
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

  if (data.items.length === 0) {
    return (
      <Empty className="min-h-[40dvh]">
        <EmptyHeader>
          <EmptyTitle>No pending coverage</EmptyTitle>
          <EmptyDescription>
            Swap and drop requests show up here after the other staff member accepts, or after
            someone picks up a drop.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3" data-test="manager-coverage-list">
      {data.items.map((row) => (
        <li
          key={row.request.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
        >
          <div>
            <p className="font-medium">
              {row.request.kind === "swap" ? "Swap" : "Drop pickup"} · {row.locationName}
            </p>
            <p className="text-muted-foreground text-sm">
              {row.fromName} → {row.request.toUserId ? "claimed" : "unclaimed"} · {row.skillName}
            </p>
          </div>
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
        </li>
      ))}
    </ul>
  );
}
