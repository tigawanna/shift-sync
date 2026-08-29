import { queryOptions } from "@tanstack/react-query";
import { listMySchedule, listStaffForShift, listWeekSchedule } from "./schedule.functions";
import type { ListMyScheduleInput, ListWeekScheduleInput, ShiftIdInput } from "./schedule.types";

export function weekScheduleQueryOptions(input: ListWeekScheduleInput) {
  return queryOptions({
    queryKey: ["schedule", "week", input.locationId, input.weekStart],
    queryFn: () => listWeekSchedule({ data: input }),
  });
}

export function staffForShiftQueryOptions(input: ShiftIdInput) {
  return queryOptions({
    queryKey: ["schedule", "staff-for-shift", input.shiftId],
    queryFn: () => listStaffForShift({ data: input }),
  });
}

export function myScheduleQueryOptions(input: ListMyScheduleInput) {
  return queryOptions({
    queryKey: ["schedule", "mine", input.weekStart],
    queryFn: () => listMySchedule({ data: input }),
  });
}
