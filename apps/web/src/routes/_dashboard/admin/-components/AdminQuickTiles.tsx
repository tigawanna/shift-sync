import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ClipboardList,
  MapPin,
  ScrollText,
  Shield,
  UserCog,
  Users,
} from "lucide-react";

const tiles = [
  {
    to: "/admin/schedules",
    title: "Schedules",
    description: "Overtime and fairness for a location week, who is working, and who is on duty.",
    icon: CalendarDays,
  },
  {
    to: "/admin/schedules/who",
    title: "Who's working",
    description: "Search the full assignment list for a week — who is working where.",
    icon: ClipboardList,
  },
  {
    to: "/admin/audit",
    title: "Audit",
    description: "Who changed a shift, when, and what it looked like before and after.",
    icon: ScrollText,
  },
  {
    to: "/admin/staff",
    title: "Staff",
    description: "Search the staff directory and review who can be scheduled.",
    icon: Users,
  },
  {
    to: "/admin/managers",
    title: "Managers",
    description: "Oversee location managers. They stay in their own dashboard — you stay here.",
    icon: UserCog,
  },
  {
    to: "/admin/admins",
    title: "Admins",
    description: "See every corporate admin account with access to this dashboard.",
    icon: Shield,
  },
  {
    to: "/admin/locations",
    title: "Locations",
    description: "Review restaurants, time zones, and addresses across Coastal Eats.",
    icon: MapPin,
  },
] as const;

export function AdminQuickTiles() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" data-test="admin-quick-tiles">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Link
            key={tile.to}
            to={tile.to}
            className="hover:bg-muted/40 flex flex-col gap-3 rounded-xl border p-6 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon className="text-muted-foreground size-5" />
              <h2 className="text-lg font-semibold tracking-tight">{tile.title}</h2>
            </div>
            <p className="text-muted-foreground text-sm">{tile.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
