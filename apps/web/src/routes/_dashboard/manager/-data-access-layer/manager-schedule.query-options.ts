import { queryOptions } from "@tanstack/react-query";
import { getManagerWeekSchedule, type ManagerWeekInput } from "./manager-schedule.fn";

export function managerWeekScheduleQueryOptions(input: ManagerWeekInput) {
  return queryOptions({
    queryKey: ["manager-schedule", input.locationId, input.weekStart],
    queryFn: () => getManagerWeekSchedule({ data: input }),
  });
}
