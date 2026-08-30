import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type {
  StaffScheduleQueryMeta,
  StaffScheduleShift,
} from "@/routes/_dashboard/staff/-data-access-layer/staff-schedule.fn";
import { WEEKLY_HOURS_LIMIT, WEEKLY_HOURS_RECOMMENDED } from "@/lib/schedule/constraints";
import {
  addMonthsYm,
  currentYearMonth,
  eachYmdInclusive,
  formatDateInZone,
  formatDayLabel,
  monthGridDates,
  yearMonthOf,
} from "@/lib/time/zoned";
import { cn } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { myStaffScheduleQueryOptions } from "../-data-access-layer/staff-schedule.query-options";
import { Route } from "../index";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const LANE_PX = 24;

type CalendarSpan = {
  id: string;
  startCol: number;
  endCol: number;
  lane: number;
  shifts: StaffScheduleShift[];
};

function shiftTimeLabel(shift: StaffScheduleShift) {
  if (shift.overnight) {
    return `${shift.startTime}–${shift.endTime} (+1)`;
  }
  return `${shift.startTime}–${shift.endTime}`;
}

function clipShiftToWeek(shift: StaffScheduleShift, weekDates: string[]) {
  const days = eachYmdInclusive(shift.startDate, shift.endDate);
  let startCol = -1;
  let endCol = -1;
  weekDates.forEach((date, index) => {
    if (!days.includes(date)) return;
    if (startCol === -1) startCol = index;
    endCol = index;
  });
  if (startCol < 0 || endCol < 0) return null;
  return { startCol, endCol };
}

function mergeAdjacent(events: Array<{ startCol: number; endCol: number; shift: StaffScheduleShift }>) {
  const sorted = [...events].sort(
    (a, b) =>
      a.shift.locationId.localeCompare(b.shift.locationId) ||
      a.shift.skillId.localeCompare(b.shift.skillId) ||
      a.startCol - b.startCol,
  );

  const merged: Array<{ startCol: number; endCol: number; shifts: StaffScheduleShift[] }> = [];
  for (const event of sorted) {
    const previous = merged[merged.length - 1];
    const sameRun =
      previous &&
      previous.shifts[0]?.locationId === event.shift.locationId &&
      previous.shifts[0]?.skillId === event.shift.skillId &&
      event.startCol <= previous.endCol + 1;
    if (sameRun && previous) {
      previous.endCol = Math.max(previous.endCol, event.endCol);
      previous.shifts.push(event.shift);
      continue;
    }
    merged.push({ startCol: event.startCol, endCol: event.endCol, shifts: [event.shift] });
  }
  return merged;
}

function packLanes(
  events: Array<{ startCol: number; endCol: number; shifts: StaffScheduleShift[] }>,
): CalendarSpan[] {
  const lanes: number[] = [];
  return events
    .sort((a, b) => a.startCol - b.startCol || b.endCol - a.endCol)
    .map((event) => {
      let lane = lanes.findIndex((occupiedUntil) => occupiedUntil < event.startCol);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(event.endCol);
      } else {
        lanes[lane] = event.endCol;
      }
      return {
        id: event.shifts.map((shift) => shift.id).join(":"),
        startCol: event.startCol,
        endCol: event.endCol,
        lane,
        shifts: event.shifts,
      };
    });
}

function weekSpans(weekDates: string[], shifts: StaffScheduleShift[]) {
  const clipped = shifts.flatMap((shift) => {
    const cols = clipShiftToWeek(shift, weekDates);
    return cols ? [{ ...cols, shift }] : [];
  });
  return packLanes(mergeAdjacent(clipped));
}

function weekScheduledHours(weekDates: string[], shifts: StaffScheduleShift[]) {
  return shifts
    .filter((shift) => clipShiftToWeek(shift, weekDates))
    .reduce((total, shift) => total + shift.hours, 0);
}

function WeekHoursCell({ hours, weekStart }: { hours: number; weekStart: string }) {
  const overLimit = hours >= WEEKLY_HOURS_LIMIT;
  const overRecommended = hours > WEEKLY_HOURS_RECOMMENDED;
  const hoursOverRecommended = hours - WEEKLY_HOURS_RECOMMENDED;
  const hoursOverLimit = hours - WEEKLY_HOURS_LIMIT;

  const hoursLabel = (
    <span className="tabular-nums">
      {hours === 0 ? "—" : `${hours.toFixed(1)}h`}
    </span>
  );

  if (!overRecommended) {
    return (
      <div className="bg-card flex h-full flex-col items-center justify-center gap-0.5 px-1">
        <p className="text-muted-foreground text-[11px] font-medium">{hoursLabel}</p>
      </div>
    );
  }

  const reason = overLimit
    ? `This week is over the ${WEEKLY_HOURS_LIMIT}h weekly limit.`
    : `This week is over the ${WEEKLY_HOURS_RECOMMENDED}h recommended load.`;

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={0}
        closeDelay={100}
        render={
          <button
            type="button"
            className={cn(
              "flex h-full w-full flex-col items-center justify-center gap-0.5 px-1",
              overLimit ? "bg-destructive/10 text-destructive" : "bg-card text-amber-600 dark:text-amber-400",
            )}
            aria-label={`${hours.toFixed(1)} hours the week of ${weekStart}, over the weekly limit`}
          />
        }
      >
        <span className="flex items-center gap-0.5 text-[11px] font-semibold">
          <TriangleAlert className="size-3 shrink-0" />
          {hoursLabel}
        </span>
      </HoverCardTrigger>
      <HoverCardContent side="left" align="center" className="w-64 p-3">
        <p className="font-medium">Week of {formatDayLabel(weekStart)}</p>
        <p className="mt-1 text-sm">{reason}</p>
        <p className="text-muted-foreground mt-2 text-xs tabular-nums">
          {hours.toFixed(1)}h scheduled
          {overLimit
            ? ` · ${hoursOverLimit.toFixed(1)}h over the ${WEEKLY_HOURS_LIMIT}h limit`
            : null}
          {` · ${hoursOverRecommended.toFixed(1)}h over the ${WEEKLY_HOURS_RECOMMENDED}h recommended`}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}

function QueryMetaPanel({
  meta,
  monthLabel,
  monthlyHours,
}: {
  meta: StaffScheduleQueryMeta;
  monthLabel: string;
  monthlyHours: number;
}) {
  return (
    <Card size="sm" data-test="staff-schedule-meta">
      <CardHeader className="border-b">
        <CardTitle className="text-base">Query pipeline</CardTitle>
        <CardDescription>
          Two Drizzle reads, then JS maps timezones, filters published weeks, and groups by day.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
        <dl className="space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Certified locations</dt>
            <dd className="font-mono">{meta.locationCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Published weeks loaded</dt>
            <dd className="font-mono">{meta.publishedWeekCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">UTC query window</dt>
            <dd className="font-mono text-xs">{meta.utcQueryStart.slice(0, 16)} → …</dd>
          </div>
        </dl>
        <dl className="space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Rows from SQL</dt>
            <dd className="font-mono">{meta.dbRowCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">After published filter</dt>
            <dd className="font-mono">{meta.publishedShiftCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">In {monthLabel}</dt>
            <dd className="font-mono">
              {meta.monthShiftCount} shifts · {monthlyHours.toFixed(1)}h
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function ShiftSpanHover({ span, side }: { span: CalendarSpan; side: "top" | "bottom" }) {
  const lead = span.shifts[0];
  if (!lead) return null;

  const hours = span.shifts.reduce((total, shift) => total + shift.hours, 0);

  return (
    <HoverCard  >
      <HoverCardTrigger
        render={
          <button
            type="button"
            className="flex h-5 w-full items-center truncate rounded-md bg-[#9c4524] px-2 text-left text-[11px] font-semibold text-[#fff7f0] hover:bg-[#863b1f] focus-visible:ring-2 focus-visible:ring-[#e08a52] focus-visible:outline-none"
          />
        }
      >
        {lead.locationName}
      </HoverCardTrigger>
      <HoverCardContent side={side} align="start" className="w-72 p-3">
        <p className="font-medium">{lead.locationName}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {lead.skillName} · {hours.toFixed(1)}h
        </p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {span.shifts.map((shift) => {
            const sameDay = shift.startDate === shift.endDate;
            const dayLabel = sameDay
              ? shift.startDate.slice(5) // e.g. 'MM-DD'
              : `${shift.startDate.slice(5)}–${shift.endDate.slice(5)}`;
       
            return (
            <li key={shift.id} className="text-xs">
              <p className="tabular-nums">
                {dayLabel}
              </p>
              <p className="text-muted-foreground tabular-nums">
                {shiftTimeLabel(shift)}
                {shift.notes ? ` · ${shift.notes}` : ""}
              </p>
            </li>
          )})}
        </ul>
        <p className="text-muted-foreground mt-2 text-[11px]">{lead.timezone}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

export function StaffSchedule() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const month = search.month ?? currentYearMonth("UTC");

  const scheduleQuery = useSuspenseQuery(myStaffScheduleQueryOptions({ month }));
  const schedule = scheduleQuery.data;

  const goToMonth = (nextMonth: string) => {
    void navigate({ search: { month: nextMonth } });
  };

  const dates = monthGridDates(month);
  const today = formatDateInZone(new Date(), "UTC");
  const shifts = useMemo(() => schedule.days.flatMap((day) => day.shifts), [schedule.days]);
  const weeks = useMemo(() => {
    const rows: string[][] = [];
    for (let index = 0; index < dates.length; index += 7) {
      rows.push(dates.slice(index, index + 7));
    }
    return rows;
  }, [dates]);

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

      <div className="-mx-1 overflow-x-auto px-1">
        <div className="min-w-232">
          <div className="overflow-hidden rounded-xl bg-foreground/50">
          <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_4.5rem] gap-0.5">
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
                  className="grid grid-cols-[repeat(7,minmax(0,1fr))_4.5rem] gap-0.5 bg-foreground/50"
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
                              isToday
                                ? "border-primary rounded-md border font-semibold"
                                : "font-medium",
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
    </div>
  );
}
