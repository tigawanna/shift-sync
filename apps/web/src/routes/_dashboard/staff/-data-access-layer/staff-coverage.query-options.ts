import { LIVE_SCHEDULE_REFETCH_MS } from "@/lib/schedule/oversight";
import { queryOptions } from "@tanstack/react-query";
import { listMyCoverage, listSwapCandidates } from "./staff-coverage.fn";

export function myCoverageQueryOptions() {
  return queryOptions({
    queryKey: ["staff-coverage"],
    queryFn: () => listMyCoverage(),
    refetchInterval: LIVE_SCHEDULE_REFETCH_MS,
  });
}

export function swapCandidatesQueryOptions(shiftId: string) {
  return queryOptions({
    queryKey: ["staff-swap-candidates", shiftId],
    queryFn: () => listSwapCandidates({ data: { shiftId } }),
    enabled: shiftId.length > 0,
  });
}
