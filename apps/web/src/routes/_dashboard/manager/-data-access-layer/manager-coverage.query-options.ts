import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { LIVE_SCHEDULE_REFETCH_MS } from "@/lib/schedule/oversight";
import { queryOptions } from "@tanstack/react-query";
import { listManagerCoverage, type ListManagerCoverageInput } from "./manager-coverage.fn";

export function managerCoverageQueryOptions(input: ListManagerCoverageInput = {}) {
  const page = input.page ?? 1;
  const perPage = input.perPage ?? ADMIN_LIST_PER_PAGE;
  const sq = input.sq ?? "";
  const status = input.status ?? "pending";

  return queryOptions({
    queryKey: ["manager-coverage", { page, perPage, sq, status }],
    queryFn: () => listManagerCoverage({ data: { page, perPage, sq, status } }),
    refetchInterval: LIVE_SCHEDULE_REFETCH_MS,
  });
}
