import { ON_DUTY_REFETCH_MS } from "@/lib/schedule/oversight";
import { queryOptions } from "@tanstack/react-query";
import {
  getAdminLaborReport,
  listAdminOnDutyNow,
  listAdminWhoWorksWhere,
  type AdminOnDutyNowInput,
  type AdminWhoWorksInput,
} from "./admin-schedules.fn";

export function adminOnDutyNowQueryOptions(input: AdminOnDutyNowInput) {
  return queryOptions({
    queryKey: ["admin-on-duty", input],
    queryFn: () => listAdminOnDutyNow({ data: input }),
    refetchInterval: ON_DUTY_REFETCH_MS,
  });
}

export function adminWhoWorksWhereQueryOptions(input: AdminWhoWorksInput) {
  return queryOptions({
    queryKey: ["admin-who-works", input],
    queryFn: () => listAdminWhoWorksWhere({ data: input }),
  });
}

export function adminLaborReportQueryOptions(input: { locationId?: string; weekStart: string }) {
  return queryOptions({
    queryKey: ["admin-labor", input.locationId ?? "all", input.weekStart],
    queryFn: () => getAdminLaborReport({ data: input }),
  });
}
