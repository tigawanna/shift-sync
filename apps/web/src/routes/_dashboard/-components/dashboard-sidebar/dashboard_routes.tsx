import type { SidebarItem } from "@/components/sidebar/types";
import { ROLE, type AppRole } from "@/lib/better-auth/roles";
import { CalendarDays, Clock, LayoutDashboard, MapPin, UserCog, Users } from "lucide-react";

export const dashboard_account_routes = [] satisfies SidebarItem[];

export function getDashboardPrimaryRoutes(role: AppRole): SidebarItem[] {
  if (role === ROLE.admin) {
    return [
      { title: "Overview", href: "/admin", icon: LayoutDashboard },
      { title: "Schedule", href: "/admin/schedule", icon: CalendarDays },
      { title: "Users", href: "/admin/users", icon: Users },
      { title: "Managers", href: "/admin/managers", icon: UserCog },
      { title: "Locations", href: "/admin/locations", icon: MapPin },
    ];
  }

  if (role === ROLE.manager) {
    return [
      { title: "Overview", href: "/manager", icon: LayoutDashboard },
      { title: "Schedule", href: "/manager/schedule", icon: CalendarDays },
      { title: "Team", href: "/manager/team", icon: Users },
      { title: "Locations", href: "/manager/locations", icon: MapPin },
    ];
  }

  return [
    { title: "My schedule", href: "/staff", icon: CalendarDays },
    { title: "Availability", href: "/staff/availability", icon: Clock },
  ];
}
