import { queryOptions } from "@tanstack/react-query";
import { getManagerLocations, listManagers, type ListManagersInput } from "./managers.fn";

export function listManagersQueryOptions(input: ListManagersInput) {
  const page = input.page;
  const perPage = input.perPage;
  const sq = input.sq?.trim();

  return queryOptions({
    queryKey: ["admin-managers", page, perPage, sq],
    queryFn: () => listManagers({ data: { page, perPage, sq } }),
  });
}

export function managerLocationsQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ["admin-manager-locations", userId],
    queryFn: () => getManagerLocations({ data: { userId } }),
  });
}
