import type { StaffScheduleShift } from "@/routes/_dashboard/staff/-data-access-layer/staff-schedule.fn";
import { eachYmdInclusive } from "@/lib/time/zoned";

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const LANE_PX = 24;
export const WEEK_GRID_COLS = "grid-cols-[repeat(7,minmax(0,1fr))_4.5rem]";

export type CalendarSpan = {
  id: string;
  startCol: number;
  endCol: number;
  lane: number;
  shifts: StaffScheduleShift[];
};

export function shiftTimeLabel(shift: StaffScheduleShift) {
  if (shift.overnight) {
    return `${shift.startTime}–${shift.endTime} (+1)`;
  }
  return `${shift.startTime}–${shift.endTime}`;
}

export function clipShiftToWeek(shift: StaffScheduleShift, weekDates: string[]) {
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

export function weekSpans(weekDates: string[], shifts: StaffScheduleShift[]) {
  const clipped = shifts.flatMap((shift) => {
    const cols = clipShiftToWeek(shift, weekDates);
    return cols ? [{ ...cols, shift }] : [];
  });
  return packLanes(mergeAdjacent(clipped));
}

export function weekScheduledHours(weekDates: string[], shifts: StaffScheduleShift[]) {
  return shifts
    .filter((shift) => clipShiftToWeek(shift, weekDates))
    .reduce((total, shift) => total + shift.hours, 0);
}

export function monthWeeks(dates: string[]) {
  const rows: string[][] = [];
  for (let index = 0; index < dates.length; index += 7) {
    rows.push(dates.slice(index, index + 7));
  }
  return rows;
}
