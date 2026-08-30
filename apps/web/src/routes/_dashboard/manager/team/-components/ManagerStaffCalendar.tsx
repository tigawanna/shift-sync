import {
  addMonthsYm,
  currentYearMonth,
  formatMonthLabel,
  mondayOfWeekContaining,
  monthGridDates,
} from "@/lib/time/zoned";
import { StaffScheduleLegend } from "@/routes/_dashboard/staff/-components/staff-schedule/StaffScheduleLegend";
import { StaffScheduleMonthGrid } from "@/routes/_dashboard/staff/-components/staff-schedule/StaffScheduleMonthGrid";
import { summarizeDayAvailability } from "@/routes/_dashboard/staff/-components/staff-schedule/staff-availability.day";
import { monthWeeks } from "@/routes/_dashboard/staff/-components/staff-schedule/staff-schedule.spans";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import {
  managerStaffAvailabilityQueryOptions,
  managerStaffDesiredHoursQueryOptions,
  managerStaffScheduleQueryOptions,
} from "../../-data-access-layer/manager-staff-calendar.query-options";

const routeApi = getRouteApi("/_dashboard/manager/team/$staffId");

export function ManagerStaffCalendar({ staffId }: { staffId: string }) {
  const search = routeApi.useSearch();
  const routeNavigate = routeApi.useNavigate();
  const navigate = useNavigate();
  const month = search.month ?? currentYearMonth("UTC");

  const scheduleQuery = useQuery(managerStaffScheduleQueryOptions({ userId: staffId, month }));
  const availabilityQuery = useQuery(
    managerStaffAvailabilityQueryOptions({ userId: staffId, month }),
  );
  const desiredQuery = useQuery(managerStaffDesiredHoursQueryOptions({ userId: staffId, month }));
  const schedule = scheduleQuery.data;

  const weeks = useMemo(() => monthWeeks(monthGridDates(month)), [month]);
  const shifts = useMemo(() => schedule?.days.flatMap((day) => day.shifts) ?? [], [schedule?.days]);
  const availabilityByDate = useMemo(() => {
    const map = new Map<string, ReturnType<typeof summarizeDayAvailability>>();
    const weekly = availabilityQuery.data?.weeklyWindows ?? [];
    const exceptions = availabilityQuery.data?.exceptions ?? [];
    for (const week of weeks) {
      for (const date of week) {
        map.set(date, summarizeDayAvailability(date, weekly, exceptions));
      }
    }
    return map;
  }, [availabilityQuery.data, weeks]);

  const monthLabel = schedule?.monthLabel ?? formatMonthLabel(month);
  const monthlyHours = schedule?.monthlyHours ?? 0;
  const shiftCount = schedule?.meta.monthShiftCount;

  let scheduleStatus = `${shiftCount} assigned shifts · ${monthlyHours.toFixed(1)} hours`;
  if (scheduleQuery.isPending) scheduleStatus = "Loading shifts…";
  if (scheduleQuery.isError) scheduleStatus = "Shifts could not be loaded";

  let availabilityStatus = "";
  if (availabilityQuery.isPending) availabilityStatus = " · Loading availability…";
  if (availabilityQuery.isError) availabilityStatus = " · Availability could not be loaded";

  return (
    <div className="flex flex-col gap-6" data-test="manager-staff-calendar">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Previous month"
            onClick={() => {
              void routeNavigate({
                to: ".",
                search: { month: addMonthsYm(month, -1) },
              });
            }}
          >
            <ChevronLeft className="size-4" />
          </button>
          <h2 className="min-w-40 text-center text-lg font-semibold">{monthLabel}</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Next month"
            onClick={() => {
              void routeNavigate({
                to: ".",
                search: { month: addMonthsYm(month, 1) },
              });
            }}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <p className="text-muted-foreground text-sm">
          {scheduleStatus}
          {availabilityStatus}
        </p>
      </div>

      {schedule && schedule.days.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No assigned shifts this month. Availability still shows so you can see when they can work.
        </p>
      ) : null}

      <StaffScheduleMonthGrid
        month={month}
        weeks={weeks}
        shifts={shifts}
        hoursByDate={schedule?.hoursByDate ?? {}}
        availabilityByDate={availabilityByDate}
        canEditAvailability={false}
        desiredByWeek={desiredQuery.data?.byWeek ?? {}}
        desiredPending={false}
        onSaveDesiredHours={() => undefined}
        onMarkAvailable={() => undefined}
        onRequestOff={() => undefined}
        onBlockHours={() => undefined}
        pendingShiftIds={new Set()}
        onAskManager={(selected) => {
          const shift = selected[0];
          if (!shift) return;
          void navigate({
            to: "/manager/schedule/$locationId/$weekStart",
            params: {
              locationId: shift.locationId,
              weekStart: mondayOfWeekContaining(new Date(shift.startsAt), shift.timezone),
            },
          });
        }}
        readOnlyDesiredHours
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <StaffScheduleLegend />
        <p className="text-muted-foreground text-xs">
          Click a shift to open that location-week and edit it. Faded bars are not published yet.
        </p>
      </div>
    </div>
  );
}
