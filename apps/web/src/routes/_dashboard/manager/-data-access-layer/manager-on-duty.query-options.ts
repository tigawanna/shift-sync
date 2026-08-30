import { ON_DUTY_REFETCH_MS } from "@/lib/schedule/oversight";
import { queryOptions } from "@tanstack/react-query";
import { listManagerOnDutyNow } from "./manager-on-duty.fn";

export function managerOnDutyNowQueryOptions() {
  return queryOptions({
    queryKey: ["manager-on-duty"],
    queryFn: () => listManagerOnDutyNow(),
    refetchInterval: ON_DUTY_REFETCH_MS,
  });
}
