import { queryOptions } from "@tanstack/react-query";
import { listLocations, type ListLocationsInput } from "./locations.fn";

export function listLocationsQueryOptions(input: ListLocationsInput) {
  const page = input.page;
  const perPage = input.perPage;
  const sq = input.sq?.trim();

  return queryOptions({
    queryKey: ["admin-locations", page, perPage, sq],
    queryFn: () => listLocations({ data: { page, perPage, sq } }),
  });
}
