import { queryOptions } from "@tanstack/react-query";
import {
  getManagerWeekSchedule,
  listManagerSchedules,
  type ListManagerSchedulesInput,
  type ManagerWeekInput,
} from "./manager-schedule.fn";

export function managerWeekScheduleQueryOptions(input: ManagerWeekInput) {
  return queryOptions({
    queryKey: ["manager-schedule", input.locationId, input.weekStart],
    queryFn: () => getManagerWeekSchedule({ data: input }),
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
