import type { SidebarItem } from "@/components/sidebar/types";
import { ROLE, type AppRole } from "@/lib/better-auth/roles";
import {
  ArrowLeftRight,
  CalendarDays,
  LayoutDashboard,
  MapPin,
  ScrollText,
  Shield,
  UserCog,
  Users,
} from "lucide-react";

export const dashboard_account_routes = [] satisfies SidebarItem[];

export function getDashboardPrimaryRoutes(role: AppRole): SidebarItem[] {
  if (role === ROLE.admin) {
    return [
      { title: "Overview", href: "/admin", icon: LayoutDashboard },
      {
        title: "Schedules",
        href: "/admin/schedules",
        icon: CalendarDays,
        sublinks: [
          { title: "Overtime and fairness", href: "/admin/schedules" },
          { title: "Who's working", href: "/admin/schedules/who" },
          { title: "On duty", href: "/admin/schedules/on-duty" },
        ],
      },
      { title: "Audit", href: "/admin/audit", icon: ScrollText },
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
      { title: "Coverage", href: "/manager/requests", icon: ArrowLeftRight },
      { title: "Team", href: "/manager/team", icon: Users },
      { title: "Locations", href: "/manager/locations", icon: MapPin },
    ];
  }

  return [{ title: "My calendar", href: "/staff", icon: CalendarDays }];
}
