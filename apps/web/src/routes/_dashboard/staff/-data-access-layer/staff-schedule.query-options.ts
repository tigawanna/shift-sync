import { LIVE_SCHEDULE_REFETCH_MS } from "@/lib/schedule/oversight";
import { queryOptions } from "@tanstack/react-query";
import { listMyStaffSchedule, type ListMyStaffScheduleInput } from "./staff-schedule.fn";

export function myStaffScheduleQueryOptions(input: ListMyStaffScheduleInput) {
  return queryOptions({
    queryKey: ["staff-schedule", input.month],
    queryFn: () => listMyStaffSchedule({ data: input }),
    refetchInterval: LIVE_SCHEDULE_REFETCH_MS,
  });
}
