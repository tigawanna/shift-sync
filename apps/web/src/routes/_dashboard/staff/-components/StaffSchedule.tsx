import { hmToMinutes, timeInputToEndMinutes } from "@/lib/schedule/availability";
import { addMonthsYm, currentYearMonth, formatMonthLabel, monthGridDates } from "@/lib/time/zoned";
import {
  addMyAvailabilityException,
  removeMyAvailabilityExceptionsOnDate,
} from "@/routes/_dashboard/staff/-data-access-layer/staff-availability.fn";
import { myStaffAvailabilityQueryOptions } from "@/routes/_dashboard/staff/-data-access-layer/staff-availability.query-options";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { myStaffScheduleQueryOptions } from "../-data-access-layer/staff-schedule.query-options";
import { Route } from "../index";
import { StaffScheduleBlockHoursDialog } from "./staff-schedule/StaffScheduleBlockHoursDialog";
import { StaffScheduleLegend } from "./staff-schedule/StaffScheduleLegend";
import { StaffScheduleMonthGrid } from "./staff-schedule/StaffScheduleMonthGrid";
import { summarizeDayAvailability } from "./staff-schedule/staff-availability.day";
import { monthWeeks } from "./staff-schedule/staff-schedule.spans";

export function StaffSchedule() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const month = search.month ?? currentYearMonth("UTC");
  const [blockHoursDate, setBlockHoursDate] = useState<string | null>(null);

  const scheduleQuery = useQuery(myStaffScheduleQueryOptions({ month }));
  const availabilityQuery = useQuery(myStaffAvailabilityQueryOptions({ month }));
  const schedule = scheduleQuery.data;

  const goToMonth = (nextMonth: string) => {
    void navigate({ search: { month: nextMonth } });
  };

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

  const invalidateAvailability = async () => {
    await queryClient.invalidateQueries({ queryKey: ["staff-availability"] });
  };

  const addException = useMutation({
    mutationFn: addMyAvailabilityException,
    onSuccess: async () => {
      await invalidateAvailability();
      toast.success("Availability updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update availability.");
    },
  });

  const removeBlocked = useMutation({
    mutationFn: removeMyAvailabilityExceptionsOnDate,
    onSuccess: async () => {
      await invalidateAvailability();
      toast.success("Marked available.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update availability.");
    },
  });

  const markAvailable = (date: string) => {
    const day = availabilityByDate.get(date);
    if (!day) return;
    if (day.allDayBlocked || day.hasPartialBlock) {
      removeBlocked.mutate({ data: { date, kind: "blocked" } });
      return;
    }
    if (day.weeklyClosed) {
      addException.mutate({
        data: { date, kind: "extra", startMinute: 0, endMinute: 24 * 60 },
      });
    }
  };

  const requestOff = (date: string) => {
    const day = availabilityByDate.get(date);
    if (day?.allDayBlocked) return;
    addException.mutate({
      data: { date, kind: "blocked", startMinute: 0, endMinute: 24 * 60 },
    });
  };

  const blockHours = ({ start, end }: { start: string; end: string }) => {
    if (!blockHoursDate) return;
    addException.mutate(
      {
        data: {
          date: blockHoursDate,
          kind: "blocked",
          startMinute: hmToMinutes(start),
          endMinute: timeInputToEndMinutes(end),
        },
      },
      {
        onSuccess: () => setBlockHoursDate(null),
      },
    );
  };

  const monthLabel = schedule?.monthLabel ?? formatMonthLabel(month);
  const monthlyHours = schedule?.monthlyHours ?? 0;
  const shiftCount = schedule?.meta.monthShiftCount;

  let scheduleStatus = `${shiftCount} published shifts · ${monthlyHours.toFixed(1)} hours`;
  if (scheduleQuery.isPending) scheduleStatus = "Loading shifts…";
  if (scheduleQuery.isError) scheduleStatus = "Shifts could not be loaded";

  let availabilityStatus = "";
  if (availabilityQuery.isPending) availabilityStatus = " · Loading availability…";
  if (availabilityQuery.isError) availabilityStatus = " · Availability could not be loaded";

  return (
    <div className="flex flex-col gap-6" data-test="staff-schedule">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Previous month"
            onClick={() => goToMonth(addMonthsYm(month, -1))}
          >
            <ChevronLeft className="size-4" />
          </button>
          <h2 className="min-w-40 text-center text-lg font-semibold">{monthLabel}</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Next month"
            onClick={() => goToMonth(addMonthsYm(month, 1))}
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
          No published shifts this month. When a manager publishes a week you are assigned to, those
          shifts will appear on the calendar. You can still mark days you cannot work.
        </p>
      ) : null}

      <StaffScheduleMonthGrid
        month={month}
        weeks={weeks}
        shifts={shifts}
        availabilityByDate={availabilityByDate}
        canEditAvailability={availabilityQuery.isSuccess}
        onMarkAvailable={markAvailable}
        onRequestOff={requestOff}
        onBlockHours={setBlockHoursDate}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <StaffScheduleLegend />
        <p className="text-muted-foreground text-xs">
          Click a date to mark it available. Right-click to request the day off or block hours.
        </p>
      </div>

      <StaffScheduleBlockHoursDialog
        date={blockHoursDate}
        pending={addException.isPending}
        onOpenChange={(open) => {
          if (!open) setBlockHoursDate(null);
        }}
        onSubmit={blockHours}
      />
    </div>
  );
}
