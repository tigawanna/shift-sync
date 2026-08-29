import { Link } from "@tanstack/react-router";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, MapPin, UserCog, Users } from "lucide-react";
import { DashboardPageHeader } from "../-components/DashboardPageHeader";

export const Route = createFileRoute("/_dashboard/admin/")({
  component: AdminOverviewPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Administration` }],
  }),
});

function AdminOverviewPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Administration"
        description="Corporate oversight for Coastal Eats — locations, users, and scheduling policy."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/admin/schedule"
          className="border-base-content/10 bg-base-100/70 hover:border-base-content/20 flex flex-col gap-3 rounded-2xl border p-6 transition-colors"
        >
          <div className="flex items-center gap-3">
            <CalendarDays className="text-base-content/70 size-5" />
            <h2 className="text-lg font-semibold tracking-tight">Schedule</h2>
          </div>
          <p className="text-base-content/70 text-sm">
            See every location and every person on the week board — who is working where.
          </p>
        </Link>
        <Link
          to="/admin/users"
          className="border-base-content/10 bg-base-100/70 hover:border-base-content/20 flex flex-col gap-3 rounded-2xl border p-6 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Users className="text-base-content/70 size-5" />
            <h2 className="text-lg font-semibold tracking-tight">Users</h2>
          </div>
          <p className="text-base-content/70 text-sm">
            Create staff accounts, search the directory, and manage location assignments.
          </p>
        </Link>
        <Link
          to="/admin/managers"
          className="border-base-content/10 bg-base-100/70 hover:border-base-content/20 flex flex-col gap-3 rounded-2xl border p-6 transition-colors"
        >
          <div className="flex items-center gap-3">
            <UserCog className="text-base-content/70 size-5" />
            <h2 className="text-lg font-semibold tracking-tight">Managers</h2>
          </div>
          <p className="text-base-content/70 text-sm">
            Create and oversee location managers. They stay in their own dashboard — you stay here.
          </p>
        </Link>
        <Link
          to="/admin/locations"
          className="border-base-content/10 bg-base-100/70 hover:border-base-content/20 flex flex-col gap-3 rounded-2xl border p-6 transition-colors"
        >
          <div className="flex items-center gap-3">
            <MapPin className="text-base-content/70 size-5" />
            <h2 className="text-lg font-semibold tracking-tight">Locations</h2>
          </div>
          <p className="text-base-content/70 text-sm">
            Manage Coastal Eats restaurants, time zones, and manager or staff assignments.
          </p>
        </Link>
      </div>
    </div>
  );
}
