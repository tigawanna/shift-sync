import type { AppRole } from "@/lib/better-auth/roles";
import { ROLE } from "@/lib/better-auth/roles";

export function isCoverageNotification(kind: string) {
  return kind === "swap_incoming" || kind.startsWith("coverage_");
}

export function hrefForNotification(kind: string, role: AppRole) {
  if (role === ROLE.staff) {
    return isCoverageNotification(kind) ? ("/staff/coverage" as const) : ("/staff" as const);
  }
  if (role === ROLE.manager) {
    if (kind === "schedule_change_request") return "/manager/schedule" as const;
    return isCoverageNotification(kind) ? ("/manager/requests" as const) : ("/manager" as const);
  }
  return "/admin" as const;
}
