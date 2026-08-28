import type { SidebarItem } from "@/components/sidebar/types";
import { ROLE, type AppRole } from "@/lib/better-auth/roles";
import { LayoutDashboard, Shield, User, Users } from "lucide-react";

export const dashboard_account_routes = [
  { title: "Account", href: "/account", icon: User },
] satisfies SidebarItem[];

export const dashboard_admin_routes = [
  { title: "Admin", href: "/admin", icon: Shield },
] satisfies SidebarItem[];

export function getDashboardPrimaryRoutes(role: AppRole): SidebarItem[] {
  const routes: SidebarItem[] = [];

  if (role === ROLE.admin || role === ROLE.manager) {
    routes.push({ title: "Manager", href: "/manager", icon: LayoutDashboard });
  }

  if (role === ROLE.admin || role === ROLE.staff) {
    routes.push({ title: "Staff", href: "/staff", icon: Users });
  }

  return routes;
}
