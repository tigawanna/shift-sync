import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardPageHeader } from "../-components/DashboardPageHeader";
import { ManagerQuickTiles } from "./-components/ManagerQuickTiles";

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
        title="Manager"
        description="Build a location week, then publish it. Staff only see shifts after that."
      />
      <ManagerQuickTiles />
    </div>
  );
}
