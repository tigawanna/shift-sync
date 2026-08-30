import { mondayOfWeekContaining } from "@/lib/time/zoned";

/** Week picker default: Coastal Eats HQ civil Monday. */
export const HQ_TIMEZONE = "America/Los_Angeles";

/** On duty depends on the clock passing, not on a write, so it keeps its own interval. */
export const ON_DUTY_REFETCH_MS = 15_000;
/** Safety net behind the pulse below, which is what normally triggers a refetch. */
export const LIVE_SCHEDULE_REFETCH_MS = 30_000;
/** Small aggregate poll that decides whether the heavy live queries need to refetch. */
export const LIVE_PULSE_REFETCH_MS = 4_000;

export function defaultWeekStartYmd(now = new Date()) {
  return mondayOfWeekContaining(now, HQ_TIMEZONE);
}

export type OnDutyNowItem = {
  assignmentId: string;
  userName: string;
  locationName: string;
  skillName: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type OnDutyNowResult = {
  asOf: string;
  items: OnDutyNowItem[];
};
