import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { currentYearMonth } from "@/lib/time/zoned";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { DashboardPageHeader } from "../-components/DashboardPageHeader";
import { myStaffScheduleQueryOptions } from "./-data-access-layer/staff-schedule.query-options";
import { StaffAvailability } from "./-components/StaffAvailability";
import { StaffSchedule } from "./-components/StaffSchedule";

const staffSearchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export const Route = createFileRoute("/_dashboard/staff/")({
  validateSearch: (search) => staffSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: async ({ context, deps }) => {
    const month = deps.month ?? currentYearMonth("UTC");
    await context.queryClient.ensureQueryData(myStaffScheduleQueryOptions({ month }));
  },
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
          <Suspense fallback={<RouterPendingComponent />}>
            <StaffSchedule />
          </Suspense>
        </TabsContent>
        <TabsContent value="availability">
          <StaffAvailability />
        </TabsContent>
      </Tabs>
    </div>
  );
}
