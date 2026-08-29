import { queryOptions } from "@tanstack/react-query";
import {
  listAccessibleLocations,
  listAllLocationsForAssignment,
  listLocations,
} from "./location.functions";
import type { ListLocationsInput } from "./location.types";

/** Paginated locations the current admin (all) or manager (assigned) can see. */
export function locationsQueryOptions(input: ListLocationsInput = {}) {
  return queryOptions({
    queryKey: ["locations", input.page ?? 1, input.search ?? ""],
    queryFn: () => listLocations({ data: input }),
  });
}

/** Full location list for assigning people to restaurants. */
export function allLocationsForAssignmentQueryOptions() {
  return queryOptions({
    queryKey: ["locations", "all-for-assignment"],
    queryFn: () => listAllLocationsForAssignment(),
  });
}

/** Locations the viewer can schedule against. */
export function accessibleLocationsQueryOptions() {
  return queryOptions({
    queryKey: ["locations", "accessible"],
    queryFn: () => listAccessibleLocations(),
  });
}
