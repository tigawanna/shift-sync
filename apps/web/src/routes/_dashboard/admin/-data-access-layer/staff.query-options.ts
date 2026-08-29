import { queryOptions } from "@tanstack/react-query";
import { listStaff, type ListStaffInput } from "./staff.fn";

export function listStaffQueryOptions(input: ListStaffInput = {}) {
  const page = input.page ?? 1;
  const q = input.q?.trim() ?? "";

  return queryOptions({
    queryKey: ["admin-staff", page, q],
    queryFn: () => listStaff({ data: { page, q: q || undefined } }),
  });
}
