import { minutesToHm } from "@/lib/schedule/availability";
import type {
  StaffAvailabilityException,
  StaffWeeklyWindow,
} from "../../-data-access-layer/staff-availability.fn";

const ALL_DAY_END = 24 * 60;

export type DayAvailability = {
  date: string;
  weekday: number;
  blocked: StaffAvailabilityException[];
  extra: StaffAvailabilityException[];
  weeklyWindows: StaffWeeklyWindow[];
  allDayBlocked: boolean;
  hasPartialBlock: boolean;
  weeklyClosed: boolean;
};

export function weekdayOfYmd(ymd: string) {
  return new Date(`${ymd}T00:00:00Z`).getUTCDay();
}

export function summarizeDayAvailability(
  date: string,
  weeklyWindows: StaffWeeklyWindow[],
  exceptions: StaffAvailabilityException[],
): DayAvailability {
  const weekday = weekdayOfYmd(date);
  const onDate = exceptions.filter((exception) => exception.date === date);
  const blocked = onDate.filter((exception) => exception.kind === "blocked");
  const extra = onDate.filter((exception) => exception.kind === "extra");
  const dayWeekly = weeklyWindows.filter((window) => window.weekday === weekday);
  const allDayBlocked = blocked.some(
    (exception) => exception.startMinute <= 0 && exception.endMinute >= ALL_DAY_END,
  );

  return {
    date,
    weekday,
    blocked,
    extra,
    weeklyWindows: dayWeekly,
    allDayBlocked,
    hasPartialBlock: !allDayBlocked && blocked.length > 0,
    weeklyClosed: weeklyWindows.length > 0 && dayWeekly.length === 0,
  };
}

export function dayAvailabilityLabel(day: DayAvailability) {
  if (day.allDayBlocked) {
    const note = day.blocked.find((exception) => exception.note)?.note;
    return note ?? "Unavailable";
  }
  if (day.hasPartialBlock) {
    return day.blocked
      .map((exception) => `${minutesToHm(exception.startMinute)}–${minutesToHm(exception.endMinute)}`)
      .join(", ");
  }
  if (day.weeklyClosed) {
    return "Usually off";
  }
  return null;
}

export function dayHasOffMark(day: DayAvailability) {
  return day.allDayBlocked || day.hasPartialBlock || day.weeklyClosed;
}
