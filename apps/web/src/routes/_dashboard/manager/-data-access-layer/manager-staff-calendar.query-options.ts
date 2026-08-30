import { queryOptions } from "@tanstack/react-query";
import {
  getManagerStaff,
  listManagerStaffAvailability,
  listManagerStaffDesiredHours,
  listManagerStaffSchedule,
  type ManagerStaffCalendarInput,
} from "./manager-staff-calendar.fn";

export function managerStaffQueryOptions(staffId: string) {
  return queryOptions({
    queryKey: ["manager-staff", staffId],
    queryFn: () => getManagerStaff({ data: { staffId } }),
  });
}

export function managerStaffScheduleQueryOptions(input: ManagerStaffCalendarInput) {
  return queryOptions({
    queryKey: ["manager-staff-schedule", input.userId, input.month],
    queryFn: () => listManagerStaffSchedule({ data: input }),
  });
}

export function managerStaffAvailabilityQueryOptions(input: ManagerStaffCalendarInput) {
  return queryOptions({
    queryKey: ["manager-staff-availability", input.userId, input.month],
    queryFn: () => listManagerStaffAvailability({ data: input }),
  });
}

export function managerStaffDesiredHoursQueryOptions(input: ManagerStaffCalendarInput) {
  return queryOptions({
    queryKey: ["manager-staff-desired-hours", input.userId, input.month],
    queryFn: () => listManagerStaffDesiredHours({ data: input }),
  });
}
