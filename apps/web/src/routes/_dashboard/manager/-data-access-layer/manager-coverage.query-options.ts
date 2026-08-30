import { queryOptions } from "@tanstack/react-query";
import { listManagerCoverage } from "./manager-coverage.fn";

export function managerCoverageQueryOptions() {
  return queryOptions({
    queryKey: ["manager-coverage"],
    queryFn: () => listManagerCoverage(),
  });
}
