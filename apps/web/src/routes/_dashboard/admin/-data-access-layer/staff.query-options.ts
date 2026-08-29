import { queryOptions } from "@tanstack/react-query";
import { listStaff } from "./staff.fn";


export const listStaffQueryOptions = (page: number, perPage: number, sq: string) => queryOptions({
  queryKey: ["staff", page, perPage, sq],
  queryFn: () => listStaff({ data: { page, perPage, sq } }),
});
