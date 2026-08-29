const formatterCache = new Map<string, Intl.DateTimeFormat>();

function tzFormatter(timeZone: string) {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const map: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of tzFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function toYmd(parts: Pick<ZonedParts, "year" | "month" | "day">) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function addDaysYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(utc.getUTCDate())}`;
}

/** Monday (YYYY-MM-DD) of the week containing `instant`, in `timeZone`. */
export function mondayOfWeekContaining(instant: Date, timeZone: string) {
  const parts = getZonedParts(instant, timeZone);
  const ymd = toYmd(parts);
  const weekday = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  const daysFromMonday = (weekday + 6) % 7;
  return addDaysYmd(ymd, -daysFromMonday);
}

/**
 * Convert a wall-clock date and time in `timeZone` to a UTC instant.
 * Ambiguous DST times resolve to the first matching offset.
 */
export function zonedWallTimeToUtc(ymd: string, timeHm: string, timeZone: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  const [hour, minute] = timeHm.split(":").map(Number);
  const wanted = Date.UTC(year, month - 1, day, hour, minute, 0);

  let utc = wanted;
  for (let i = 0; i < 4; i += 1) {
    const parts = getZonedParts(new Date(utc), timeZone);
    const asIfUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const diff = wanted - asIfUtc;
    if (diff === 0) break;
    utc += diff;
  }

  return new Date(utc);
}

export function formatTimeInZone(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

export function formatDateInZone(date: Date, timeZone: string) {
  return toYmd(getZonedParts(date, timeZone));
}

export function weekdayInZone(date: Date, timeZone: string) {
  const ymd = formatDateInZone(date, timeZone);
  return new Date(`${ymd}T00:00:00Z`).getUTCDay();
}

export function minutesFromMidnight(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  return parts.hour * 60 + parts.minute;
}

export function shiftDurationMs(startsAt: Date, endsAt: Date) {
  return endsAt.getTime() - startsAt.getTime();
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function formatWeekdayYmd(ymd: string) {
  const weekday = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return WEEKDAY_LABELS[weekday];
}

export function yearMonthOf(ymd: string) {
  return ymd.slice(0, 7);
}

export function currentYearMonth(timeZone = "UTC") {
  return yearMonthOf(toYmd(getZonedParts(new Date(), timeZone)));
}

export function monthStartYmd(yearMonth: string) {
  return `${yearMonth}-01`;
}

export function addMonthsYm(yearMonth: string, delta: number) {
  const [year, month] = yearMonth.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}`;
}

export function lastDateOfMonth(yearMonth: string) {
  return addDaysYmd(monthStartYmd(addMonthsYm(yearMonth, 1)), -1);
}

export function formatMonthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDayLabel(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Monday–Sunday dates covering the printed month grid. */
export function monthGridDates(yearMonth: string) {
  const first = monthStartYmd(yearMonth);
  const last = lastDateOfMonth(yearMonth);
  const startPad = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const endPad = (7 - new Date(`${last}T00:00:00Z`).getUTCDay()) % 7;
  const gridStart = addDaysYmd(first, -startPad);
  const gridEnd = addDaysYmd(last, endPad);
  const dates: string[] = [];
  for (let date = gridStart; date <= gridEnd; date = addDaysYmd(date, 1)) {
    dates.push(date);
  }
  return dates;
}

export function eachYmdInclusive(start: string, end: string) {
  if (end < start) return [start];
  const dates: string[] = [];
  for (let date = start; date <= end; date = addDaysYmd(date, 1)) {
    dates.push(date);
  }
  return dates;
}
