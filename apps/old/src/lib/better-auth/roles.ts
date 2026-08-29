import type { BetterAuthSession } from "@/lib/better-auth/client";
import { ROLE, type AppRole } from "@/lib/better-auth/permissions";

export { ROLE, type AppRole };

export const APP_ROLES = Object.values(ROLE);

const knownRoles = new Set<string>(APP_ROLES);

type ViewerUser = BetterAuthSession["user"];

export function parseAppRole(rawRole: string | null | undefined): AppRole {
  const assigned = new Set(
    rawRole
      ?.split(",")
      .map((part) => part.trim().toLowerCase())
      .filter((part) => knownRoles.has(part)),
  );

  if (assigned.has(ROLE.admin)) return ROLE.admin;
  if (assigned.has(ROLE.manager)) return ROLE.manager;
  if (assigned.has(ROLE.staff)) return ROLE.staff;
  return ROLE.staff;
}

export function getUserAppRole(user: ViewerUser | undefined): AppRole {
  return parseAppRole(user?.role);
}

export function hasAppRole(role: AppRole, allowed: readonly AppRole[]): boolean {
  return allowed.includes(role);
}

export function isAdminRole(role: AppRole): boolean {
  return role === ROLE.admin;
}

export function isManagerRole(role: AppRole): boolean {
  return role === ROLE.manager;
}

export function isStaffRole(role: AppRole): boolean {
  return role === ROLE.staff;
}

export function getHomePathForRole(role: AppRole): string {
  if (role === ROLE.admin) return "/admin";
  if (role === ROLE.manager) return "/manager";
  return "/staff";
}

/** Whether a dashboard path is reachable for the given app role. */
export function isDashboardPathAllowedForRole(path: string, role: AppRole): boolean {
  if (path.startsWith("/account")) {
    return true;
  }
  if (path.startsWith("/admin")) {
    return isAdminRole(role);
  }
  if (path.startsWith("/manager")) {
    return isManagerRole(role);
  }
  if (path.startsWith("/staff")) {
    return isStaffRole(role);
  }
  return false;
}

export function resolveDashboardPath(returnTo: string | undefined, role: AppRole): string {
  if (returnTo && isDashboardPathAllowedForRole(returnTo, role)) {
    return returnTo;
  }
  return getHomePathForRole(role);
}
