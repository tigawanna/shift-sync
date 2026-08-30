import { queryOptions } from "@tanstack/react-query";
import {
  listAdminStaffAvailability,
  listAdminStaffDesiredHours,
  listAdminStaffSchedule,
  type AdminStaffCalendarInput,
} from "./staff-calendar.fn";

export function adminStaffScheduleQueryOptions(input: AdminStaffCalendarInput) {
  return queryOptions({
    queryKey: ["admin-staff-schedule", input.userId, input.month],
    queryFn: () => listAdminStaffSchedule({ data: input }),
  });
}

export function adminStaffAvailabilityQueryOptions(input: AdminStaffCalendarInput) {
  return queryOptions({
    queryKey: ["admin-staff-availability", input.userId, input.month],
    queryFn: () => listAdminStaffAvailability({ data: input }),
  });
}

export function adminStaffDesiredHoursQueryOptions(input: AdminStaffCalendarInput) {
  return queryOptions({
    queryKey: ["admin-staff-desired-hours", input.userId, input.month],
    queryFn: () => listAdminStaffDesiredHours({ data: input }),
  });
}
