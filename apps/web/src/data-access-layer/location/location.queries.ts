import { queryOptions } from "@tanstack/react-query";
import {
  listAccessibleLocations,
  listAllLocationsForAssignment,
  listLocations,
} from "./location.functions";
import type { ListLocationsInput } from "./location.types";

export function locationsQueryOptions(input: ListLocationsInput = {}) {
  return queryOptions({
    queryKey: ["locations", input.page ?? 1, input.search ?? ""],
    queryFn: () => listLocations({ data: input }),
  });
}

export function allLocationsForAssignmentQueryOptions() {
  return queryOptions({
    queryKey: ["locations", "all-for-assignment"],
    queryFn: () => listAllLocationsForAssignment(),
  });
}

export function accessibleLocationsQueryOptions() {
  return queryOptions({
    queryKey: ["locations", "accessible"],
    queryFn: () => listAccessibleLocations(),
  });
}
