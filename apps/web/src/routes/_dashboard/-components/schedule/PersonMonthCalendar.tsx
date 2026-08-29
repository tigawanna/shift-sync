import type {
  PersonCalendarWeekStat,
  PersonMonthSchedule,
  WeekShift,
} from "@/data-access-layer/schedule/schedule.types";
import { userScheduleQueryOptions } from "@/data-access-layer/schedule/schedule.queries";
import { teamMemberQueryOptions } from "@/data-access-layer/team/team.queries";
import { ROLE } from "@/lib/better-auth/roles";
import {
  addMonthsYm,
  currentYearMonth,
  eachYmdInclusive,
  formatMonthLabel,
  monthGridDates,
  yearMonthOf,
} from "@/lib/time/zoned";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { AssignDayMenu, type AssignMenuState } from "./AssignDayMenu";
import { skillAccentClass, shiftTimeLabel } from "./shift-display";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const LANE_PX = 22;

type CalendarSpan = {
  id: string;
  startCol: number;
  endCol: number;
  lane: number;
  shifts: WeekShift[];
};

function clipShiftToWeek(shift: WeekShift, weekDates: string[]) {
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

function mergeAdjacent(
  events: Array<{ startCol: number; endCol: number; shift: WeekShift }>,
): Array<{ startCol: number; endCol: number; shifts: WeekShift[] }> {
  const sorted = [...events].sort(
    (a, b) =>
      a.shift.locationId.localeCompare(b.shift.locationId) ||
      a.shift.skillId.localeCompare(b.shift.skillId) ||
      a.startCol - b.startCol,
  );

  const merged: Array<{ startCol: number; endCol: number; shifts: WeekShift[] }> = [];
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
  events: Array<{ startCol: number; endCol: number; shifts: WeekShift[] }>,
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

function weekSpans(weekDates: string[], shifts: WeekShift[]) {
  const clipped = shifts.flatMap((shift) => {
    const cols = clipShiftToWeek(shift, weekDates);
    return cols ? [{ ...cols, shift }] : [];
  });
  return packLanes(mergeAdjacent(clipped));
}

function ShiftHoverCard({ shifts, above }: { shifts: WeekShift[]; above?: boolean }) {
  const first = shifts[0];
  if (!first) return null;

  return (
    <div
      className={`border-base-content/15 bg-base-100 pointer-events-none invisible absolute left-0 z-30 w-64 rounded-xl border p-3 opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${
        above ? "bottom-full mb-1.5" : "top-full mt-1.5"
      }`}
    >
      <p className="text-sm font-semibold">{first.locationName}</p>
      <p className="text-base-content/65 mt-0.5 text-xs">{first.skillName}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {shifts.map((shift) => (
          <li key={shift.id} className="text-xs tabular-nums">
            {shift.startDate === shift.endDate
              ? shift.startDate.slice(5)
              : `${shift.startDate.slice(5)}–${shift.endDate.slice(5)}`}{" "}
            · {shiftTimeLabel(shift)}
            {shift.notes ? ` · ${shift.notes}` : ""}
          </li>
        ))}
      </ul>
      {first.managers.length > 0 ? (
        <p className="text-base-content/60 mt-2 text-xs">Managers: {first.managers.join(", ")}</p>
      ) : null}
      {first.createdByName ? (
        <p className="text-base-content/60 mt-1 text-xs">Scheduled by {first.createdByName}</p>
      ) : null}
      <p className="text-base-content/45 mt-2 text-[11px]">{first.timezone}</p>
    </div>
  );
}

function WeekStatRail({ stat }: { stat: PersonCalendarWeekStat }) {
  const [open, setOpen] = useState(false);
  const hasWarnings = stat.warnings.length > 0;
  const hoursClass = stat.weeklyOvertime
    ? "text-error"
    : stat.weeklyWarn
      ? "text-warning"
      : "text-base-content/70";

  return (
    <div className="border-base-content/10 flex w-[4.75rem] shrink-0 flex-col items-end justify-center gap-1 border-l px-2">
      <button
        type="button"
        className={`text-right text-[11px] leading-tight font-medium tabular-nums ${hoursClass} ${hasWarnings ? "hover:underline" : ""}`}
        disabled={!hasWarnings}
        onClick={() => setOpen(true)}
        aria-label={
          hasWarnings
            ? `${stat.hours.toFixed(1)} hours this week, with scheduling warnings`
            : `${stat.hours.toFixed(1)} hours this week`
        }
      >
        {stat.hours.toFixed(1)}h
      </button>
      {hasWarnings ? (
        <div className="flex items-center gap-1">
          {stat.restCount > 0 ? (
            <button
              type="button"
              className="bg-error size-2 rounded-full"
              aria-label="Rest period warning"
              onClick={() => setOpen(true)}
            />
          ) : null}
          {stat.dailyBlock || stat.dailyWarn ? (
            <button
              type="button"
              className={`size-2 rounded-full ${stat.dailyBlock ? "bg-error" : "bg-warning"}`}
              aria-label="Daily hours warning"
              onClick={() => setOpen(true)}
            />
          ) : null}
        </div>
      ) : null}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Week of {stat.weekStart}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2 text-sm">
                <p>
                  If they work every assigned shift this week:{" "}
                  <span className="font-medium tabular-nums">{stat.hours.toFixed(1)} hours</span>
                  {stat.maxDailyHours > 0 ? (
                    <>
                      {". "}
                      Busiest day:{" "}
                      <span className="font-medium tabular-nums">
                        {stat.maxDailyHours.toFixed(1)} hours
                      </span>
                      .
                    </>
                  ) : null}
                </p>
                <ul className="flex list-disc flex-col gap-1 pl-4">
                  {stat.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PersonMonthGrid({
  month,
  shifts,
  weekStats,
  onAssignDate,
}: {
  month: string;
  shifts: WeekShift[];
  weekStats: PersonCalendarWeekStat[];
  onAssignDate?: (date: string, x: number, y: number) => void;
}) {
  const dates = monthGridDates(month);
  const weeks: string[][] = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7));
  }
  const statsByWeek = new Map(weekStats.map((stat) => [stat.weekStart, stat]));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex">
        <div className="grid min-w-0 flex-1 grid-cols-7">
          {WEEKDAYS.map((label) => (
            <p
              key={label}
              className="text-base-content/50 px-1 text-center text-[11px] font-medium tracking-wide uppercase"
            >
              {label}
            </p>
          ))}
        </div>
        <p className="text-base-content/50 w-[4.75rem] shrink-0 px-2 text-right text-[11px] font-medium tracking-wide uppercase">
          Week
        </p>
      </div>
      <div className="flex flex-col">
        {weeks.map((weekDates, weekIndex) => {
          const spans = weekSpans(weekDates, shifts);
          const laneCount = spans.reduce((max, span) => Math.max(max, span.lane + 1), 0);
          const bodyHeight = Math.max(52, 28 + laneCount * LANE_PX);
          const weekStart = weekDates[0] ?? "";
          const stat = statsByWeek.get(weekStart);

          return (
            <div
              key={weekStart}
              className="border-base-content/10 flex border-b last:border-b-0"
              style={{ minHeight: bodyHeight }}
            >
              <div className="relative min-w-0 flex-1">
                <div className="grid h-full grid-cols-7">
                  {weekDates.map((date) => {
                    const inMonth = yearMonthOf(date) === month;
                    return (
                      <div
                        key={date}
                        data-calendar-date={date}
                        className={`border-base-content/8 border-r px-1.5 pt-1.5 last:border-r-0 ${
                          inMonth ? "" : "opacity-35"
                        } ${onAssignDate ? "cursor-context-menu" : ""}`}
                        onContextMenu={
                          onAssignDate
                            ? (event) => {
                                event.preventDefault();
                                onAssignDate(date, event.clientX, event.clientY);
                              }
                            : undefined
                        }
                      >
                        <span className="text-sm font-medium tabular-nums">{date.slice(8)}</span>
                      </div>
                    );
                  })}
                </div>
                <div
                  className="pointer-events-none absolute inset-x-0 top-7 bottom-1 grid grid-cols-7 gap-x-1 px-1"
                  style={{ gridTemplateRows: `repeat(${Math.max(laneCount, 1)}, ${LANE_PX}px)` }}
                >
                  {spans.map((span) => {
                    const lead = span.shifts[0];
                    if (!lead) return null;
                    return (
                      <div
                        key={span.id}
                        className="group pointer-events-auto relative"
                        style={{
                          gridColumn: `${span.startCol + 1} / ${span.endCol + 2}`,
                          gridRow: span.lane + 1,
                        }}
                      >
                        <button
                          type="button"
                          className={`h-4.5 w-full truncate rounded-md border px-1.5 text-left text-[11px] leading-4 font-medium ${skillAccentClass(lead.skillId)}`}
                        >
                          {lead.locationName}
                        </button>
                        <ShiftHoverCard
                          shifts={span.shifts}
                          above={weekIndex >= weeks.length - 2}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              {stat ? <WeekStatRail stat={stat} /> : <div className="w-[4.75rem] shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type PersonMonthCalendarProps = {
  schedule: PersonMonthSchedule;
  onMonthChange?: (month: string) => void;
  assignUserId?: string;
};

export function PersonMonthCalendar({
  schedule,
  onMonthChange,
  assignUserId,
}: PersonMonthCalendarProps) {
  const [assignMenu, setAssignMenu] = useState<AssignMenuState | null>(null);

  return (
    <div className="flex min-h-144 flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm">
          <span className="font-medium tabular-nums">{schedule.monthlyHours.toFixed(1)}</span>{" "}
          <span className="text-base-content/60">hours this month</span>
        </p>
        {onMonthChange ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square"
              aria-label="Previous month"
              onClick={() => onMonthChange(addMonthsYm(schedule.month, -1))}
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="min-w-40 text-center text-sm font-medium">
              {formatMonthLabel(schedule.month)}
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square"
              aria-label="Next month"
              onClick={() => onMonthChange(addMonthsYm(schedule.month, 1))}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : null}
      </div>

      <PersonMonthGrid
        month={schedule.month}
        shifts={schedule.shifts}
        weekStats={schedule.weekStats ?? []}
        onAssignDate={assignUserId ? (date, x, y) => setAssignMenu({ date, x, y }) : undefined}
      />
      {assignUserId && assignMenu ? (
        <AssignDayMenu
          userId={assignUserId}
          month={schedule.month}
          menu={assignMenu}
          onClose={() => setAssignMenu(null)}
        />
      ) : null}
    </div>
  );
}

export function UserScheduleSection({ userId }: { userId: string }) {
  const [month, setMonth] = useState(() => currentYearMonth("UTC"));
  const scheduleQuery = useSuspenseQuery(userScheduleQueryOptions({ userId, month }));
  const memberQuery = useQuery(teamMemberQueryOptions({ userId }));
  const canAssign = memberQuery.data?.role === ROLE.staff;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2">
      <PersonMonthCalendar
        schedule={scheduleQuery.data}
        onMonthChange={setMonth}
        assignUserId={canAssign ? userId : undefined}
      />
    </section>
  );
}
