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

export function swapCandidatesQueryOptions(shiftIds: string[], q = "") {
  const ids = [...shiftIds].sort();
  const query = q.trim();
  return queryOptions({
    queryKey: ["staff-swap-candidates", ids, query],
    queryFn: () => listSwapCandidates({ data: { shiftIds: ids, q: query } }),
    enabled: ids.length > 0,
  });
}
