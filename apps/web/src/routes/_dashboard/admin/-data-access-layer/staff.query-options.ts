import { queryOptions } from "@tanstack/react-query";
import { listStaff, type ListStaffInput } from "./staff.fn";

export function listStaffQueryOptions(input: ListStaffInput) {
  const page = input.page;
  const perPage = input.perPage;
  const sq = input.sq?.trim();

  return queryOptions({
    queryKey: ["admin-staff", page, perPage, sq],
    queryFn: () => listStaff({ data: { page, perPage, sq } }),
  });
}
