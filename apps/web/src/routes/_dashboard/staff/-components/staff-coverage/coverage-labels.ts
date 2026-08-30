import { formatDateInZone, formatTimeInZone } from "@/lib/time/zoned";

export function coverageStatusLabel(status: string, audience: "staff" | "manager" = "staff") {
  if (status === "pending_peer") return "Waiting on teammate";
  if (status === "pending_manager") {
    return audience === "manager" ? "Needs approval" : "Accepted — waiting on manager";
  }
  if (status === "open") return "Open drop";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "withdrawn") return "Withdrawn";
  if (status === "cancelled") return "Cancelled";
  if (status === "expired") return "Expired";
  return status;
}

export function coverageKindLabel(kind: string) {
  return kind === "swap" ? "Swap" : "Drop";
}

export function coverageShiftWhen(startsAt: Date, endsAt: Date, timezone: string) {
  const startDate = formatDateInZone(startsAt, timezone);
  const endDate = formatDateInZone(endsAt, timezone);
  const startTime = formatTimeInZone(startsAt, timezone);
  const endTime = formatTimeInZone(endsAt, timezone);
  if (startDate === endDate) {
    return `${startDate} · ${startTime}–${endTime}`;
  }
  return `${startDate} ${startTime} – ${endDate} ${endTime}`;
}
