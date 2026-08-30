import { addMonthsYm, currentYearMonth, monthGridDates } from "@/lib/time/zoned";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { myStaffScheduleQueryOptions } from "../-data-access-layer/staff-schedule.query-options";
import { Route } from "../index";
import { StaffScheduleMonthGrid } from "./staff-schedule/StaffScheduleMonthGrid";
import { QueryMetaPanel } from "./staff-schedule/StaffScheduleQueryMeta";
import { monthWeeks } from "./staff-schedule/staff-schedule.spans";

export function StaffSchedule() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const month = search.month ?? currentYearMonth("UTC");
  const scheduleQuery = useSuspenseQuery(myStaffScheduleQueryOptions({ month }));
  const schedule = scheduleQuery.data;

  const goToMonth = (nextMonth: string) => {
    void navigate({ search: { month: nextMonth } });
  };

  const weeks = useMemo(() => monthWeeks(monthGridDates(month)), [month]);
  const shifts = useMemo(() => schedule.days.flatMap((day) => day.shifts), [schedule.days]);

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
          <h2 className="min-w-40 text-center text-lg font-semibold">{schedule.monthLabel}</h2>
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
          {schedule.meta.monthShiftCount} published shifts · {schedule.monthlyHours.toFixed(1)} hours
        </p>
      </div>

      <QueryMetaPanel
        meta={schedule.meta}
        monthLabel={schedule.monthLabel}
        monthlyHours={schedule.monthlyHours}
      />

      {schedule.days.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No published shifts this month. When a manager publishes a week you are assigned to, those
          shifts will appear on the calendar.
        </p>
      ) : null}

      <StaffScheduleMonthGrid month={month} weeks={weeks} shifts={shifts} />
    </div>
  );
}
