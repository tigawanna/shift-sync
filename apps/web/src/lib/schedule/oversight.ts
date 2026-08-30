import { mondayOfWeekContaining } from "@/lib/time/zoned";

/** Week picker default: Coastal Eats HQ civil Monday. */
export const HQ_TIMEZONE = "America/Los_Angeles";

export const ON_DUTY_REFETCH_MS = 15_000;
export const LIVE_SCHEDULE_REFETCH_MS = 15_000;

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
