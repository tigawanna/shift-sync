import {
  acceptIncomingSwap,
  declineIncomingSwap,
  pickupDrop,
  requestDrop,
  requestSwap,
  withdrawCoverage,
} from "@/routes/_dashboard/staff/-data-access-layer/staff-coverage.fn";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useCoverageMutations(onSettledSuccess?: () => void) {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["staff-coverage"] });
    await queryClient.invalidateQueries({ queryKey: ["staff-coverage-requests"] });
    await queryClient.invalidateQueries({ queryKey: ["staff-schedule"] });
    await queryClient.invalidateQueries({ queryKey: ["staff-swap-candidates"] });
  };

  const onError = (error: unknown) => {
    toast.error(error instanceof Error ? error.message : "Could not update coverage.");
  };

  const afterSuccess = async (message: string) => {
    await invalidate();
    toast.success(message);
    onSettledSuccess?.();
  };

  return {
    drop: useMutation({
      mutationFn: requestDrop,
      onSuccess: () =>
        afterSuccess("Drop offered. You stay on the shift until a manager approves a pickup."),
      onError,
    }),
    swap: useMutation({
      mutationFn: requestSwap,
      onSuccess: () => afterSuccess("Swap sent. You stay on the shift until a manager approves."),
      onError,
    }),
    pickup: useMutation({
      mutationFn: pickupDrop,
      onSuccess: () => afterSuccess("Pickup is waiting on a manager."),
      onError,
    }),
    accept: useMutation({
      mutationFn: acceptIncomingSwap,
      onSuccess: () => afterSuccess("Accepted. A manager still has to approve."),
      onError,
    }),
    decline: useMutation({
      mutationFn: declineIncomingSwap,
      onSuccess: () => afterSuccess("Swap declined."),
      onError,
    }),
    withdraw: useMutation({
      mutationFn: withdrawCoverage,
      onSuccess: () => afterSuccess("Request withdrawn."),
      onError,
    }),
  };
}
