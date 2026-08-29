import type { SidebarItem } from "@/components/sidebar/types";
import { ROLE, type AppRole } from "@/lib/better-auth/roles";
import { CalendarDays, LayoutDashboard, Shield, User } from "lucide-react";

export const dashboard_account_routes = [
  { title: "Account", href: "/account", icon: User },
] satisfies SidebarItem[];

export const dashboard_admin_routes = [
  {
    title: "Administration",
    href: "/admin",
    icon: Shield,
    sublinks: [
      { title: "Overview", href: "/admin" },
      { title: "Users", href: "/admin/users" },
      { title: "Locations", href: "/admin/locations" },
    ],
  },
] satisfies SidebarItem[];

export function getDashboardPrimaryRoutes(role: AppRole): SidebarItem[] {
  const routes: SidebarItem[] = [];

  if (role === ROLE.admin || role === ROLE.manager) {
    routes.push({
      title: "Manager",
      href: "/manager",
      icon: LayoutDashboard,
      sublinks: [
        { title: "Overview", href: "/manager" },
        { title: "Schedule", href: "/manager/schedule" },
        { title: "Team", href: "/manager/team" },
        { title: "Locations", href: "/manager/locations" },
      ],
    });
  }

  if (role === ROLE.admin || role === ROLE.staff) {
    routes.push({ title: "My schedule", href: "/staff", icon: CalendarDays });
  }

  return routes;
}
