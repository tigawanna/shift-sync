import { LIVE_SCHEDULE_REFETCH_MS } from "@/lib/schedule/oversight";
import { queryOptions } from "@tanstack/react-query";
import { listManagerShiftAudit } from "./manager-audit.fn";
import { getManagerLaborReport } from "./manager-labor.fn";
import { listManagerSkills, listStaffForManagerShift } from "./manager-shifts.fn";
import {
  getManagerWeekSchedule,
  listManagerSchedules,
  type ListManagerSchedulesInput,
  type ManagerWeekInput,
} from "./manager-schedule.fn";

export function managerLaborReportQueryOptions(input: { locationId: string; weekStart: string }) {
  return queryOptions({
    queryKey: ["manager-labor", input.locationId, input.weekStart],
    queryFn: () => getManagerLaborReport({ data: input }),
  });
}

export function managerWeekScheduleQueryOptions(input: ManagerWeekInput) {
  return queryOptions({
    queryKey: ["manager-schedule", input.locationId, input.weekStart],
    queryFn: () => getManagerWeekSchedule({ data: input }),
    refetchInterval: LIVE_SCHEDULE_REFETCH_MS,
  });
}

export function listManagerSchedulesQueryOptions(input: ListManagerSchedulesInput) {
  const page = input.page;
  const perPage = input.perPage;
  const sq = input.sq?.trim();
  const locationId = input.locationId;

  return queryOptions({
    queryKey: ["manager-schedules", page, perPage, sq, locationId],
    queryFn: () => listManagerSchedules({ data: { page, perPage, sq, locationId } }),
  });
}

export function managerSkillsQueryOptions() {
  return queryOptions({
    queryKey: ["manager-skills"],
    queryFn: () => listManagerSkills(),
  });
}

export function managerShiftAuditQueryOptions(shiftId: string) {
  return queryOptions({
    queryKey: ["manager-shift-audit", shiftId],
    queryFn: () => listManagerShiftAudit({ data: { shiftId } }),
    enabled: shiftId.length > 0,
  });
}

export function staffForManagerShiftQueryOptions(shiftId: string, q = "") {
  const query = q.trim();
  return queryOptions({
    queryKey: ["manager-shift-staff", shiftId, query],
    queryFn: () => listStaffForManagerShift({ data: { shiftId, q: query } }),
    enabled: shiftId.length > 0,
  });
}
