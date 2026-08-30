import { ON_DUTY_REFETCH_MS } from "@/lib/schedule/oversight";
import { queryOptions } from "@tanstack/react-query";
import { loadManagerHome } from "./manager-home.fn";

export function managerHomeQueryOptions() {
  return queryOptions({
    queryKey: ["manager-home"],
    queryFn: () => loadManagerHome(),
    refetchInterval: ON_DUTY_REFETCH_MS,
  });
}
