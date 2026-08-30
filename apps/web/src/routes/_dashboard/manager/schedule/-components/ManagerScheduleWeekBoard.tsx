import { formatDateInZone } from "@/lib/time/zoned";
import { cn } from "@/lib/utils";
import type { ManagerWeekSchedule } from "../../-data-access-layer/manager-schedule.fn";
import { ManagerScheduleShiftBar } from "./ManagerScheduleShiftBar";
import { LANE_PX, weekSpans } from "./manager-schedule.spans";

export function ManagerScheduleWeekBoard({
  days,
  timezone,
  editing,
  onSelectShift,
  onAddDay,
}: {
  days: ManagerWeekSchedule["days"];
  timezone: string;
  editing: boolean;
  onSelectShift: (shiftId: string) => void;
  onAddDay: (date: string) => void;
}) {
  const weekDates = days.map((day) => day.date);
  const shifts = days.flatMap((day) => day.shifts);
  const spans = weekSpans(weekDates, shifts);
  const laneCount = spans.reduce((max, span) => Math.max(max, span.lane + 1), 0);
  const bodyHeight = Math.max(160, 40 + laneCount * LANE_PX);
  const today = formatDateInZone(new Date(), timezone);

  return (
    <div className="-mx-1 overflow-x-auto px-1" data-test="manager-schedule-week" id="week-board">
      <div className="min-w-4xl">
        <div
          className={cn(
            "bg-foreground/50 overflow-hidden rounded-xl",
            editing && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
        >
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day) => (
              <p
                key={day.date}
                className="text-muted-foreground bg-muted px-2 py-1.5 text-center text-[11px] font-medium tracking-wide uppercase"
              >
                {day.weekday}
              </p>
            ))}
          </div>
          <div className="relative mt-0.5 grid grid-cols-7 gap-0.5" style={{ height: bodyHeight }}>
            {days.map((day) => (
              <section
                key={day.date}
                className={cn(
                  "bg-card flex h-full flex-col px-2 pt-1.5 ring-1 ring-foreground/30 ring-inset",
                  day.date === today && "ring-primary",
                  editing && "cursor-pointer",
                )}
                data-test="manager-schedule-day"
                onClick={() => {
                  if (editing) onAddDay(day.date);
                }}
              >
                <p
                  className={cn(
                    "text-sm tabular-nums",
                    day.date === today ? "font-semibold" : "font-medium",
                  )}
                >
                  {day.date.slice(8)}
                </p>
              </section>
            ))}
            <div
              className="pointer-events-none absolute inset-x-0 top-8 bottom-1.5 grid grid-cols-7 gap-x-0.5 px-0.5"
              style={{ gridTemplateRows: `repeat(${Math.max(laneCount, 1)}, ${LANE_PX}px)` }}
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
                  <ManagerScheduleShiftBar
                    span={span}
                    side="bottom"
                    editing={editing}
                    onSelect={onSelectShift}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
