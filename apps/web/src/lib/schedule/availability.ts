import { pad2 } from "@/lib/time/zoned";

export const AVAILABILITY_EXCEPTION_KINDS = ["blocked", "extra"] as const;
export type AvailabilityExceptionKind = (typeof AVAILABILITY_EXCEPTION_KINDS)[number];

export type AvailabilityWindow = {
  weekday: number;
  startMinute: number;
  endMinute: number;
};

export type AvailabilityException = {
  date: string;
  kind: AvailabilityExceptionKind;
  startMinute: number;
  endMinute: number;
};

function coversMinute(startMinute: number, endMinute: number, minute: number) {
  return minute >= startMinute && minute < endMinute;
}

/** Whether this civil-date minute is open, given weekly windows plus one-off exceptions. */
export function isAvailableAt(input: {
  weekday: number;
  ymd: string;
  minute: number;
  weekly: AvailabilityWindow[];
  exceptions: AvailabilityException[];
}) {
  const onDate = input.exceptions.filter((exception) => exception.date === input.ymd);
  if (
    onDate.some(
      (exception) =>
        exception.kind === "blocked" &&
        coversMinute(exception.startMinute, exception.endMinute, input.minute),
    )
  ) {
    return false;
  }

  if (input.weekly.length === 0) {
    return true;
  }

  if (
    onDate.some(
      (exception) =>
        exception.kind === "extra" &&
        coversMinute(exception.startMinute, exception.endMinute, input.minute),
    )
  ) {
    return true;
  }

  return input.weekly.some(
    (window) =>
      window.weekday === input.weekday &&
      coversMinute(window.startMinute, window.endMinute, input.minute),
  );
}

export function minutesToHm(minutes: number) {
  if (minutes >= 24 * 60) return "24:00";
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

export function hmToMinutes(value: string) {
  if (value === "24:00") return 24 * 60;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

/** `<input type="time">` cannot represent 24:00, so midnight-ending windows use 23:59 in the control. */
export function minutesToTimeInput(minutes: number) {
  if (minutes >= 24 * 60) return "23:59";
  return minutesToHm(minutes);
}

export function timeInputToEndMinutes(value: string) {
  if (value === "23:59" || value === "24:00") return 24 * 60;
  return hmToMinutes(value);
}
