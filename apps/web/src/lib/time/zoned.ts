const formatterCache = new Map<string, Intl.DateTimeFormat>();

/** Cached Intl formatter used by {@link getZonedParts}. Temporal: drop this; use `ZonedDateTime` fields. */
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

/** Wall-clock fields of an instant in a zone. Temporal: `ZonedDateTime` (`year`, `month`, `day`, `hour`, …). */
export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/**
 * Split a UTC `Date` into wall-clock parts in `timeZone`.
 * @remarks Temporal: `Temporal.Instant.fromEpochMilliseconds(date.getTime()).toZonedDateTimeISO(timeZone)`.
 */
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

/**
 * Zero-pad a number to two digits (`7` → `"07"`).
 * @remarks Temporal: not needed; `PlainDate` / `PlainTime` `.toString()` already pads.
 */
export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * Build a civil `YYYY-MM-DD` from year/month/day parts.
 * @remarks Temporal: `Temporal.PlainDate.from({ year, month, day }).toString()`.
 */
export function toYmd(parts: Pick<ZonedParts, "year" | "month" | "day">) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/**
 * Add calendar days to a civil date. Timezone-free (`2026-01-31` + 1 → `2026-02-01`).
 * @remarks Temporal: `Temporal.PlainDate.from(ymd).add({ days }).toString()`.
 */
export function addDaysYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(utc.getUTCDate())}`;
}

/**
 * Monday (`YYYY-MM-DD`) of the week containing `instant`, in `timeZone`.
 * Used to match `schedule_week.week_start_date`.
 * @remarks Temporal: `zdt.toPlainDate().subtract({ days: zdt.dayOfWeek - 1 })` (`dayOfWeek` is Mon=1).
 */
export function mondayOfWeekContaining(instant: Date, timeZone: string) {
  const parts = getZonedParts(instant, timeZone);
  const ymd = toYmd(parts);
  const weekday = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  const daysFromMonday = (weekday + 6) % 7;
  return addDaysYmd(ymd, -daysFromMonday);
}

/**
 * Convert a wall-clock date + `HH:mm` in `timeZone` to a UTC `Date`.
 * Ambiguous DST times resolve to the first matching offset.
 * @remarks Temporal: `Temporal.PlainDateTime.from(\`${ymd}T${timeHm}\`).toZonedDateTime(timeZone).toInstant()`.
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

/**
 * `HH:mm` of an instant in `timeZone`.
 * @remarks Temporal: `zdt.toPlainTime().toString({ smallestUnit: "minute" })`.
 */
export function formatTimeInZone(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

/**
 * Civil `YYYY-MM-DD` of an instant in `timeZone`.
 * @remarks Temporal: `zdt.toPlainDate().toString()`.
 */
export function formatDateInZone(date: Date, timeZone: string) {
  return toYmd(getZonedParts(date, timeZone));
}

/**
 * Weekday of an instant in `timeZone`. `0` = Sunday … `6` = Saturday (JS `Date` convention).
 * @remarks Temporal: `zdt.dayOfWeek` is Mon=1 … Sun=7; map with `zdt.dayOfWeek % 7` if you need Sun=0.
 */
export function weekdayInZone(date: Date, timeZone: string) {
  const ymd = formatDateInZone(date, timeZone);
  return new Date(`${ymd}T00:00:00Z`).getUTCDay();
}

/**
 * Minutes since local midnight in `timeZone` (`09:30` → `570`). Used for availability windows.
 * @remarks Temporal: `zdt.hour * 60 + zdt.minute`.
 */
export function minutesFromMidnight(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  return parts.hour * 60 + parts.minute;
}

/**
 * Elapsed milliseconds between two UTC instants (overnight shifts stay one interval).
 * @remarks Temporal: `Temporal.Instant.fromEpochMilliseconds(ends).since(Temporal.Instant.fromEpochMilliseconds(starts)).total({ unit: "milliseconds" })`.
 */
export function shiftDurationMs(startsAt: Date, endsAt: Date) {
  return endsAt.getTime() - startsAt.getTime();
}

/** Short weekday labels indexed by JS Sunday=0. Temporal: `PlainDate.dayOfWeek` is Mon=1. */
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * Short weekday label for a civil date (`"Mon"`).
 * @remarks Temporal: `Temporal.PlainDate.from(ymd).toLocaleString("en-US", { weekday: "short" })`.
 */
export function formatWeekdayYmd(ymd: string) {
  const weekday = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return WEEKDAY_LABELS[weekday];
}

/**
 * `YYYY-MM` prefix of a civil date.
 * @remarks Temporal: `Temporal.PlainDate.from(ymd).toPlainYearMonth().toString()`.
 */
export function yearMonthOf(ymd: string) {
  return ymd.slice(0, 7);
}

/**
 * Current `YYYY-MM` in `timeZone` (defaults to UTC).
 * @remarks Temporal: `Temporal.Now.zonedDateTimeISO(timeZone).toPlainYearMonth().toString()`.
 */
export function currentYearMonth(timeZone = "UTC") {
  return yearMonthOf(toYmd(getZonedParts(new Date(), timeZone)));
}

/**
 * First civil date of a `YYYY-MM` month.
 * @remarks Temporal: `Temporal.PlainYearMonth.from(yearMonth).toPlainDate({ day: 1 }).toString()`.
 */
export function monthStartYmd(yearMonth: string) {
  return `${yearMonth}-01`;
}

/**
 * Add calendar months to a `YYYY-MM`.
 * @remarks Temporal: `Temporal.PlainYearMonth.from(yearMonth).add({ months: delta }).toString()`.
 */
export function addMonthsYm(yearMonth: string, delta: number) {
  const [year, month] = yearMonth.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}`;
}

/**
 * Last civil date of a `YYYY-MM` month.
 * @remarks Temporal: `ym.toPlainDate({ day: Temporal.PlainYearMonth.from(yearMonth).daysInMonth })`.
 */
export function lastDateOfMonth(yearMonth: string) {
  return addDaysYmd(monthStartYmd(addMonthsYm(yearMonth, 1)), -1);
}

/**
 * Long month label (`"August 2026"`). Calendar-only; not a location timezone.
 * @remarks Temporal: `Temporal.PlainYearMonth.from(yearMonth).toLocaleString("en-US", { month: "long", year: "numeric" })`.
 */
export function formatMonthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Long weekday + date label (`"Saturday, August 29, 2026"`). Calendar-only.
 * @remarks Temporal: `Temporal.PlainDate.from(ymd).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric" })`.
 */
export function formatDayLabel(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Monday–Sunday civil dates covering the printed month grid (leading/trailing overflow days).
 * @remarks Temporal: `PlainYearMonth` → first/last `PlainDate`, pad with `dayOfWeek`, then `add({ days: 1 })` in a loop.
 */
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

/**
 * Inclusive list of civil dates from `start` to `end` (`YYYY-MM-DD`).
 * @remarks Temporal: walk `PlainDate.from(start)` with `.add({ days: 1 })` until `.until(end)` is negative.
 */
export function eachYmdInclusive(start: string, end: string) {
  if (end < start) return [start];
  const dates: string[] = [];
  for (let date = start; date <= end; date = addDaysYmd(date, 1)) {
    dates.push(date);
  }
  return dates;
}
