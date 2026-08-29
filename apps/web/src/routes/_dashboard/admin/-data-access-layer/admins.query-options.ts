import { queryOptions } from "@tanstack/react-query";
import { listAdmins, type ListAdminsInput } from "./admins.fn";

export function listAdminsQueryOptions(input: ListAdminsInput) {
  const page = input.page;
  const perPage = input.perPage;
  const sq = input.sq?.trim();

  return queryOptions({
    queryKey: ["admin-admins", page, perPage, sq],
    queryFn: () => listAdmins({ data: { page, perPage, sq } }),
  });
}
