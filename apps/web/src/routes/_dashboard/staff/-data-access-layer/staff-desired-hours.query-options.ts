import { queryOptions } from "@tanstack/react-query";
import { listMyDesiredHours, type ListMyDesiredHoursInput } from "./staff-desired-hours.fn";

export function myDesiredHoursQueryOptions(input: ListMyDesiredHoursInput) {
  return queryOptions({
    queryKey: ["staff-desired-hours", input.month],
    queryFn: () => listMyDesiredHours({ data: input }),
  });
}
