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
