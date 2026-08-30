import { ON_DUTY_REFETCH_MS } from "@/lib/schedule/oversight";
import { queryOptions } from "@tanstack/react-query";
import {
  getAdminManager,
  getManagerLocations,
  listManagers,
  loadAdminManagerHome,
  type ListManagersInput,
} from "./managers.fn";

export function listManagersQueryOptions(input: ListManagersInput) {
  const page = input.page;
  const perPage = input.perPage;
  const sq = input.sq?.trim();
  const locationId = input.locationId;

  return queryOptions({
    queryKey: ["admin-managers", page, perPage, sq, locationId],
    queryFn: () => listManagers({ data: { page, perPage, sq, locationId } }),
  });
}

export function managerLocationsQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ["admin-manager-locations", userId],
    queryFn: () => getManagerLocations({ data: { userId } }),
  });
}

export function adminManagerQueryOptions(managerId: string) {
  return queryOptions({
    queryKey: ["admin-manager-profile", managerId],
    queryFn: () => getAdminManager({ data: { managerId } }),
  });
}

export function adminManagerHomeQueryOptions(managerId: string) {
  return queryOptions({
    queryKey: ["admin-manager-home", managerId],
    queryFn: () => loadAdminManagerHome({ data: { managerId } }),
    refetchInterval: ON_DUTY_REFETCH_MS,
  });
}
