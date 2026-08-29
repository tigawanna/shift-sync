import { queryOptions } from "@tanstack/react-query";
import { getMyStaffProfile } from "./staff-profile.functions";

export function myStaffProfileQueryOptions() {
  return queryOptions({
    queryKey: ["staff-profile", "me"],
    queryFn: () => getMyStaffProfile(),
  });
}
