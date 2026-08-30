import { queryOptions } from "@tanstack/react-query";
import { getStaffDirectory, listSkillOptions, listStaff, type ListStaffInput } from "./staff.fn";

export function listStaffQueryOptions(input: ListStaffInput) {
  const page = input.page;
  const perPage = input.perPage;
  const sq = input.sq?.trim();
  const locationId = input.locationId;

  return queryOptions({
    queryKey: ["admin-staff", page, perPage, sq, locationId],
    queryFn: () => listStaff({ data: { page, perPage, sq, locationId } }),
  });
}

export function skillOptionsQueryOptions() {
  return queryOptions({
    queryKey: ["admin-skill-options"],
    queryFn: () => listSkillOptions(),
  });
}

export function staffDirectoryQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ["admin-staff-directory", userId],
    queryFn: () => getStaffDirectory({ data: { userId } }),
  });
}
