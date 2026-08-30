import type { ManagerWeekShift } from "../../-data-access-layer/manager-schedule.fn";
import { eachYmdInclusive } from "@/lib/time/zoned";

export const LANE_PX = 28;

export type ManagerWeekSpan = {
  id: string;
  startCol: number;
  endCol: number;
  lane: number;
  shift: ManagerWeekShift;
};

export function shiftTimeLabel(shift: ManagerWeekShift) {
  if (shift.overnight) {
    return `${shift.startTime}–${shift.endTime} (+1)`;
  }
  return `${shift.startTime}–${shift.endTime}`;
}

function clipShiftToWeek(shift: ManagerWeekShift, weekDates: string[]) {
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

export function weekSpans(weekDates: string[], shifts: ManagerWeekShift[]) {
  const events = shifts.flatMap((shift) => {
    const cols = clipShiftToWeek(shift, weekDates);
    return cols ? [{ ...cols, shift }] : [];
  });

  const lanes: number[] = [];
  return events
    .sort((left, right) => left.startCol - right.startCol || right.endCol - left.endCol)
    .map((event) => {
      let lane = lanes.findIndex((occupiedUntil) => occupiedUntil < event.startCol);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(event.endCol);
      } else {
        lanes[lane] = event.endCol;
      }
      return {
        id: event.shift.id,
        startCol: event.startCol,
        endCol: event.endCol,
        lane,
        shift: event.shift,
      } satisfies ManagerWeekSpan;
    });
}
