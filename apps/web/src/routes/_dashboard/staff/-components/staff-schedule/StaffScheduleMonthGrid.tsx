import type { StaffScheduleShift } from "@/routes/_dashboard/staff/-data-access-layer/staff-schedule.fn";
import { formatDateInZone, formatDayLabel, yearMonthOf } from "@/lib/time/zoned";
import { cn } from "@/lib/utils";
import { ShiftSpanHover } from "./StaffScheduleShiftBar";
import { WeekHoursCell } from "./StaffScheduleWeekHours";
import {
  LANE_PX,
  WEEK_GRID_COLS,
  WEEKDAYS,
  weekScheduledHours,
  weekSpans,
} from "./staff-schedule.spans";

export function StaffScheduleMonthGrid({
  month,
  weeks,
  shifts,
}: {
  month: string;
  weeks: string[][];
  shifts: StaffScheduleShift[];
}) {
  const today = formatDateInZone(new Date(), "UTC");

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="min-w-232">
        <div className="bg-foreground/50 overflow-hidden rounded-xl">
          <div className={cn("grid gap-0.5", WEEK_GRID_COLS)}>
            {WEEKDAYS.map((label) => (
              <p
                key={label}
                className="text-muted-foreground bg-muted px-2 py-1.5 text-center text-[11px] font-medium tracking-wide uppercase"
              >
                {label}
              </p>
            ))}
            <p className="text-muted-foreground bg-muted px-1 py-1.5 text-center text-[11px] font-medium tracking-wide uppercase">
              Hours
            </p>
          </div>
          <div className="mt-0.5 flex flex-col gap-0.5">
            {weeks.map((weekDates, weekIndex) => {
              const spans = weekSpans(weekDates, shifts);
              const laneCount = spans.reduce((max, span) => Math.max(max, span.lane + 1), 0);
              const bodyHeight = Math.max(64, 36 + laneCount * LANE_PX);
              const hours = weekScheduledHours(weekDates, shifts);
              const weekStart = weekDates[0] ?? "";

              return (
                <div
                  key={weekStart}
                  className={cn("bg-foreground/50 grid gap-0.5", WEEK_GRID_COLS)}
                  style={{ height: bodyHeight }}
                >
                  <div className="relative col-span-7 grid grid-cols-7 gap-0.5">
                    {weekDates.map((date) => {
                      const inMonth = yearMonthOf(date) === month;
                      const isToday = date === today;

                      return (
                        <div
                          key={date}
                          aria-label={formatDayLabel(date)}
                          className={cn(
                            "h-full px-2 pt-1.5 ring-1 ring-foreground/30 ring-inset",
                            inMonth ? "bg-card" : "bg-muted/50",
                          )}
                        >
                          <time
                            dateTime={date}
                            className={cn(
                              "inline-flex size-6 items-center justify-center text-sm tabular-nums",
                              isToday ? "border-primary rounded-md border font-semibold" : "font-medium",
                              !inMonth && "text-muted-foreground",
                            )}
                          >
                            {date.slice(8)}
                          </time>
                        </div>
                      );
                    })}
                    <div
                      className="absolute inset-x-0 top-8 bottom-1.5 grid grid-cols-7 gap-x-0.5 px-0.5"
                      style={{ gridTemplateRows: `repeat(${Math.max(laneCount, 1)}, ${LANE_PX}px)` }}
                    >
                      {spans.map((span) => (
                        <div
                          key={span.id}
                          className="min-w-0"
                          style={{
                            gridColumn: `${span.startCol + 1} / ${span.endCol + 2}`,
                            gridRow: span.lane + 1,
                          }}
                        >
                          <ShiftSpanHover
                            span={span}
                            side={weekIndex >= weeks.length - 2 ? "top" : "bottom"}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <WeekHoursCell hours={hours} weekStart={weekStart} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
