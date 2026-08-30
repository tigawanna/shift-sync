import type { StaffScheduleShift } from "@/routes/_dashboard/staff/-data-access-layer/staff-schedule.fn";
import { formatDateInZone, yearMonthOf } from "@/lib/time/zoned";
import { cn } from "@/lib/utils";
import { StaffScheduleDayCell } from "./StaffScheduleDayCell";
import { ShiftSpanHover } from "./StaffScheduleShiftBar";
import { StaffScheduleDesiredHours } from "./StaffScheduleDesiredHours";
import { WeekHoursCell } from "./StaffScheduleWeekHours";
import type { DayAvailability } from "./staff-availability.day";
import {
  LANE_PX,
  WEEK_GRID_COLS,
  WEEKDAYS,
  hoursOnDate,
  longestWorkedStreak,
  weekScheduledHours,
  weekSpans,
} from "./staff-schedule.spans";

export function StaffScheduleMonthGrid({
  month,
  weeks,
  shifts,
  hoursByDate,
  availabilityByDate,
  canEditAvailability,
  desiredByWeek,
  desiredPending,
  pendingShiftIds,
  onSaveDesiredHours,
  onMarkAvailable,
  onRequestOff,
  onBlockHours,
  onSwapShifts,
  onDropShifts,
  onAskManager,
  readOnlyDesiredHours = false,
}: {
  month: string;
  weeks: string[][];
  shifts: StaffScheduleShift[];
  hoursByDate: Record<string, number>;
  availabilityByDate: Map<string, DayAvailability>;
  canEditAvailability: boolean;
  desiredByWeek: Record<string, number>;
  desiredPending: boolean;
  pendingShiftIds: Set<string>;
  onSaveDesiredHours: (weekStartDate: string, hours: number | null) => void;
  onMarkAvailable: (date: string) => void;
  onRequestOff: (date: string) => void;
  onBlockHours: (date: string) => void;
  onSwapShifts?: (shifts: StaffScheduleShift[]) => void;
  onDropShifts?: (shifts: StaffScheduleShift[]) => void;
  onAskManager?: (shifts: StaffScheduleShift[]) => void;
  readOnlyDesiredHours?: boolean;
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
              const consecutiveDays = longestWorkedStreak(weekDates, hoursByDate);
              const weekStart = weekDates[0] ?? "";

              return (
                <div
                  key={weekStart}
                  className={cn("bg-foreground/50 grid gap-0.5", WEEK_GRID_COLS)}
                  style={{ height: bodyHeight }}
                >
                  <div className="relative col-span-7 grid grid-cols-7 gap-0.5">
                    {weekDates.map((date) => (
                      <StaffScheduleDayCell
                        key={date}
                        date={date}
                        inMonth={yearMonthOf(date) === month}
                        isToday={date === today}
                        dailyHours={hoursOnDate(hoursByDate, date)}
                        availability={availabilityByDate.get(date) ?? null}
                        canEdit={canEditAvailability}
                        onMarkAvailable={onMarkAvailable}
                        onRequestOff={onRequestOff}
                        onBlockHours={onBlockHours}
                      />
                    ))}
                    <div
                      className="pointer-events-none absolute inset-x-0 top-8 bottom-1.5 grid grid-cols-7 gap-x-0.5 px-0.5"
                      style={{
                        gridTemplateRows: `repeat(${Math.max(laneCount, 1)}, ${LANE_PX}px)`,
                      }}
                    >
                      {spans.map((span) => (
                        <div
                          key={span.id}
                          className="pointer-events-auto min-w-0"
                          style={{
                            gridColumn: `${span.startCol + 1} / ${span.endCol + 2}`,
                            gridRow: span.lane + 1,
                          }}
                        >
                          <ShiftSpanHover
                            span={span}
                            side={weekIndex >= weeks.length - 2 ? "top" : "bottom"}
                            pendingShiftIds={pendingShiftIds}
                            onSwap={onSwapShifts}
                            onDrop={onDropShifts}
                            onAskManager={onAskManager}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="min-h-0 flex-1">
                      <WeekHoursCell
                        hours={hours}
                        weekStart={weekStart}
                        consecutiveDays={consecutiveDays}
                      />
                    </div>
                    <StaffScheduleDesiredHours
                      weekStart={weekStart}
                      hours={desiredByWeek[weekStart] ?? null}
                      pending={desiredPending}
                      readOnly={readOnlyDesiredHours}
                      onSave={onSaveDesiredHours}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
