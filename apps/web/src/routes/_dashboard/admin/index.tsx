import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardPageHeader } from "../-components/DashboardPageHeader";
import { AdminQuickTiles } from "./-components/AdminQuickTiles";

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
        description="Corporate oversight for Coastal Eats — locations, people, and schedules."
      />
      <AdminQuickTiles />
    </div>
  );
}
