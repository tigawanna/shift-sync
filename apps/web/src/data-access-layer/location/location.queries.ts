import { queryOptions } from "@tanstack/react-query";
import { listLocations } from "./location.functions";
import type { ListLocationsInput } from "./location.types";

export function locationsQueryOptions(input: ListLocationsInput = {}) {
  return queryOptions({
    queryKey: ["locations", input.page ?? 1, input.search ?? ""],
    queryFn: () => listLocations({ data: input }),
  });
}
