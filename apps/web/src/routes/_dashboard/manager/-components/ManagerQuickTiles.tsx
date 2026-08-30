import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin } from "lucide-react";

const tiles = [
  {
    to: "/manager/schedule",
    title: "Schedule",
    description: "Review a location week, then publish it so assigned staff can see their shifts.",
    icon: CalendarDays,
  },
  {
    to: "/manager/locations",
    title: "Locations",
    description: "The restaurants you run. Times always follow each location timezone.",
    icon: MapPin,
  },
] as const;

export function ManagerQuickTiles() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" data-test="manager-quick-tiles">
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
