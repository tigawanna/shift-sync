import type { SidebarItem } from "@/components/sidebar/types";
import { ROLE, type AppRole } from "@/lib/better-auth/roles";
import { CalendarDays, LayoutDashboard, MapPin, Shield, UserCog, Users } from "lucide-react";

export const dashboard_account_routes = [] satisfies SidebarItem[];

export function getDashboardPrimaryRoutes(role: AppRole): SidebarItem[] {
  if (role === ROLE.admin) {
    return [
      { title: "Overview", href: "/admin", icon: LayoutDashboard },
      { title: "Schedules", href: "/admin/schedules", icon: CalendarDays },
      { title: "Staff", href: "/admin/staff", icon: Users },
      { title: "Managers", href: "/admin/managers", icon: UserCog },
      { title: "Admins", href: "/admin/admins", icon: Shield },
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

  return [];
}
