import { Link } from "@tanstack/react-router";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Users } from "lucide-react";
import { DashboardPageHeader } from "../-components/DashboardPageHeader";

export const Route = createFileRoute("/_dashboard/manager/")({
  component: ManagerOverviewPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Manager` }],
  }),
});

function ManagerOverviewPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Manager dashboard"
        description="Build schedules, review coverage, and keep your locations staffed."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/manager/team"
          className="border-base-content/10 bg-base-100/70 hover:border-base-content/20 flex flex-col gap-3 rounded-2xl border p-6 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Users className="text-base-content/70 size-5" />
            <h2 className="text-lg font-semibold tracking-tight">Team</h2>
          </div>
          <p className="text-base-content/70 text-sm">
            Staff you can schedule. Sign in as any team member to preview their experience.
          </p>
        </Link>
        <Link
          to="/manager/locations"
          className="border-base-content/10 bg-base-100/70 hover:border-base-content/20 flex flex-col gap-3 rounded-2xl border p-6 transition-colors"
        >
          <div className="flex items-center gap-3">
            <MapPin className="text-base-content/70 size-5" />
            <h2 className="text-lg font-semibold tracking-tight">Locations</h2>
          </div>
          <p className="text-base-content/70 text-sm">
            Restaurants you manage. Scheduling and coverage tools will filter to these locations.
          </p>
        </Link>
      </div>
    </div>
  );
}
