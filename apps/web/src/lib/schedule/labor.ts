import { WEEKLY_HOURS_LIMIT } from "@/lib/schedule/assign-constraints";
import { minutesFromMidnight, weekdayInZone } from "@/lib/time/zoned";

/** Assumed Coastal Eats wage for projected overtime cost. */
export const HOURLY_RATE_USD = 22;
export const OVERTIME_MULTIPLIER = 1.5;
/** Friday or Saturday, local start at or after 16:00. */
export const PREMIUM_EVENING_MINUTE = 16 * 60;

export function overtimeHours(weeklyHours: number) {
  return Math.max(0, weeklyHours - WEEKLY_HOURS_LIMIT);
}

export function overtimeCostUsd(weeklyHours: number) {
  return overtimeHours(weeklyHours) * HOURLY_RATE_USD * OVERTIME_MULTIPLIER;
}

export function isPremiumStart(startsAt: Date, timeZone: string) {
  const weekday = weekdayInZone(startsAt, timeZone);
  if (weekday !== 5 && weekday !== 6) return false;
  return minutesFromMidnight(startsAt, timeZone) >= PREMIUM_EVENING_MINUTE;
}

/** 100 = even premium counts (or nobody has any). Lower when a few people hold most premium shifts. */
export function premiumFairnessScore(counts: number[]) {
  if (counts.length < 2) return 100;
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return 100;
  const mean = total / counts.length;
  const mad = counts.reduce((sum, count) => sum + Math.abs(count - mean), 0) / counts.length;
  return Math.round(Math.max(0, Math.min(100, 100 * (1 - mad / (mean + 1)))));
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}
