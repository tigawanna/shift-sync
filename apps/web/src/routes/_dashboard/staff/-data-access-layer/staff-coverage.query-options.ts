import { queryOptions } from "@tanstack/react-query";
import { listMyCoverage, listSwapCandidates } from "./staff-coverage.fn";

export function myCoverageQueryOptions() {
  return queryOptions({
    queryKey: ["staff-coverage"],
    queryFn: () => listMyCoverage(),
  });
}

export function swapCandidatesQueryOptions(shiftId: string) {
  return queryOptions({
    queryKey: ["staff-swap-candidates", shiftId],
    queryFn: () => listSwapCandidates({ data: { shiftId } }),
    enabled: shiftId.length > 0,
  });
}
