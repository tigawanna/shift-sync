import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { MapPin, Users } from "lucide-react";

export function ManagerHomeCounts({
  staffCount,
  locationCount,
}: {
  staffCount: number;
  locationCount: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" data-test="manager-home-counts">
      <Link to="/manager/team" className="rounded-xl">
        <Card className="hover:bg-muted/40 h-full transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground size-4" />
              <CardDescription>Staff</CardDescription>
            </div>
            <CardTitle className="font-heading text-3xl tabular-nums">{staffCount}</CardTitle>
            <CardDescription>Certified at your locations. Open the team list.</CardDescription>
          </CardHeader>
        </Card>
      </Link>
      <Link to="/manager/locations" className="rounded-xl">
        <Card className="hover:bg-muted/40 h-full transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="text-muted-foreground size-4" />
              <CardDescription>Locations</CardDescription>
            </div>
            <CardTitle className="font-heading text-3xl tabular-nums">{locationCount}</CardTitle>
            <CardDescription>Restaurants you run. Open the location list.</CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}
