import { queryOptions } from "@tanstack/react-query";
import { listMyStaffAvailability, type ListMyStaffAvailabilityInput } from "./staff-availability.fn";

export function myStaffAvailabilityQueryOptions(input: ListMyStaffAvailabilityInput) {
  return queryOptions({
    queryKey: ["staff-availability", input.month],
    queryFn: () => listMyStaffAvailability({ data: input }),
  });
}
