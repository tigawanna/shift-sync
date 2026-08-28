import type { SidebarItem } from "@/components/sidebar/types";
import { LayoutDashboard, Shield, User, Users } from "lucide-react";

export const dashboard_account_routes = [
  { title: "Account", href: "/account", icon: User },
] satisfies SidebarItem[];

export const dashboard_admin_routes = [
  { title: "Admin", href: "/admin", icon: Shield },
] satisfies SidebarItem[];

export function getDashboardPrimaryRoutes(): SidebarItem[] {
  return [
    { title: "Manager", href: "/manager", icon: LayoutDashboard },
    { title: "Staff", href: "/staff", icon: Users },
  ];
}
