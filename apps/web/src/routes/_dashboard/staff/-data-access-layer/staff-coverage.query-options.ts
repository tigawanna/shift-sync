import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { LIVE_SCHEDULE_REFETCH_MS } from "@/lib/schedule/oversight";
import { queryOptions } from "@tanstack/react-query";
import {
  listMyCoverage,
  listMyCoverageRequests,
  listSwapCandidates,
  type ListMyCoverageRequestsInput,
} from "./staff-coverage.fn";

export function myCoverageQueryOptions() {
  return queryOptions({
    queryKey: ["staff-coverage"],
    queryFn: () => listMyCoverage(),
    refetchInterval: LIVE_SCHEDULE_REFETCH_MS,
  });
}

export function myCoverageRequestsQueryOptions(input: ListMyCoverageRequestsInput) {
  const page = input.page ?? 1;
  const perPage = input.perPage ?? ADMIN_LIST_PER_PAGE;
  const sq = input.sq ?? "";
  const status = input.status ?? "all";

  return queryOptions({
    queryKey: ["staff-coverage-requests", { page, perPage, sq, status }],
    queryFn: () => listMyCoverageRequests({ data: { page, perPage, sq, status } }),
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
