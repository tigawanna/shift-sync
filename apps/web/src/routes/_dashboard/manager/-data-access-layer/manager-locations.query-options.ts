import { queryOptions } from "@tanstack/react-query";
import { listMyManagerLocations } from "./manager-locations.fn";

export function myManagerLocationsQueryOptions() {
  return queryOptions({
    queryKey: ["manager-locations"],
    queryFn: () => listMyManagerLocations(),
  });
}
