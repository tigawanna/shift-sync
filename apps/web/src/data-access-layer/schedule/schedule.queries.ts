import { queryOptions } from "@tanstack/react-query";
import {
  listMySchedule,
  listMonthOverview,
  listOverviewDay,
  listDayAssignableShifts,
  listStaffForShift,
  listUserSchedule,
  listWeekSchedule,
  previewLocationMove,
} from "./schedule.functions";
import type {
  ListMonthOverviewInput,
  ListMyScheduleInput,
  ListOverviewDayInput,
  ListUserScheduleInput,
  ListWeekScheduleInput,
  ShiftIdInput,
} from "./schedule.types";

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
    queryKey: ["schedule", "mine", input.month],
    queryFn: () => listMySchedule({ data: input }),
  });
}

export function monthOverviewQueryOptions(input: ListMonthOverviewInput) {
  return queryOptions({
    queryKey: ["schedule", "month", input.month],
    queryFn: () => listMonthOverview({ data: input }),
  });
}

export function overviewDayQueryOptions(input: ListOverviewDayInput) {
  return queryOptions({
    queryKey: ["schedule", "day", input.date],
    queryFn: () => listOverviewDay({ data: input }),
    enabled: Boolean(input.date),
  });
}

export function userScheduleQueryOptions(input: ListUserScheduleInput) {
  return queryOptions({
    queryKey: ["schedule", "user", input.userId, input.month],
    queryFn: () => listUserSchedule({ data: input }),
  });
}

export function dayAssignableShiftsQueryOptions(input: { date: string; userId: string }) {
  return queryOptions({
    queryKey: ["schedule", "day-assign", input.userId, input.date],
    queryFn: () => listDayAssignableShifts({ data: input }),
    enabled: Boolean(input.date && input.userId),
  });
}

export function locationMovePreviewQueryOptions(input: {
  userId: string;
  weekStart: string;
  locationIds: string[];
}) {
  return queryOptions({
    queryKey: ["schedule", "location-move", input.userId, input.weekStart, input.locationIds],
    queryFn: () =>
      previewLocationMove({
        data: {
          userId: input.userId,
          weekStart: input.weekStart,
          locationIdsCsv: input.locationIds.join(","),
        },
      }),
  });
}
