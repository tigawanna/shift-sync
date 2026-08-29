import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardPageHeader } from "../-components/DashboardPageHeader";
import { StaffAvailability } from "./-components/StaffAvailability";
import { StaffSchedule } from "./-components/StaffSchedule";

export const Route = createFileRoute("/_dashboard/staff/")({
  component: StaffHomePage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | My calendar` }],
  }),
});

function StaffHomePage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="My calendar"
        description="Your published schedule and the hours you can work."
      />

      <Tabs defaultValue="schedule" className="w-full">
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule">
          <StaffSchedule />
        </TabsContent>
        <TabsContent value="availability">
          <StaffAvailability />
        </TabsContent>
      </Tabs>
    </div>
  );
}
