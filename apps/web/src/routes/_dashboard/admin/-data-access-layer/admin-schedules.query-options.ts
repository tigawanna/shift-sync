import { ON_DUTY_REFETCH_MS } from "@/lib/schedule/oversight";
import { queryOptions } from "@tanstack/react-query";
import {
  getAdminLaborReport,
  listAdminLocationWeeks,
  listAdminOnDutyNow,
  listAdminWhoWorksWhere,
  type AdminWhoWorksInput,
} from "./admin-schedules.fn";

export function adminOnDutyNowQueryOptions() {
  return queryOptions({
    queryKey: ["admin-on-duty"],
    queryFn: () => listAdminOnDutyNow(),
    refetchInterval: ON_DUTY_REFETCH_MS,
  });
}

export function adminLocationWeeksQueryOptions(weekStart: string) {
  return queryOptions({
    queryKey: ["admin-location-weeks", weekStart],
    queryFn: () => listAdminLocationWeeks({ data: { weekStart } }),
  });
}

export function adminWhoWorksWhereQueryOptions(input: AdminWhoWorksInput) {
  return queryOptions({
    queryKey: ["admin-who-works", input],
    queryFn: () => listAdminWhoWorksWhere({ data: input }),
  });
}

export function adminLaborReportQueryOptions(input: { locationId: string; weekStart: string }) {
  return queryOptions({
    queryKey: ["admin-labor", input.locationId, input.weekStart],
    queryFn: () => getAdminLaborReport({ data: input }),
  });
}
