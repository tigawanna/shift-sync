import { myScheduleQueryOptions } from "@/data-access-layer/schedule/schedule.queries";
import { ROLE, getHomePathForRole, getUserAppRole } from "@/lib/better-auth/roles";
import { currentYearMonth } from "@/lib/time/zoned";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { DashboardPageHeader } from "../-components/DashboardPageHeader";
import { PersonMonthCalendar } from "../-components/schedule/PersonMonthCalendar";

const staffSearchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export const Route = createFileRoute("/_dashboard/staff/")({
  validateSearch: (search) => staffSearchSchema.parse(search),
  beforeLoad: ({ context }) => {
    const role = getUserAppRole(context.viewer?.user);
    if (role !== ROLE.staff && role !== ROLE.admin) {
      throw redirect({ to: getHomePathForRole(role) });
    }
  },
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: async ({ context, deps }) => {
    const month = deps.month ?? currentYearMonth("UTC");
    await context.queryClient.ensureQueryData(myScheduleQueryOptions({ month }));
  },
  component: StaffSchedulePage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | My schedule` }],
  }),
});

function StaffSchedulePage() {
  return (
    <Suspense fallback={<RouterPendingComponent />}>
      <StaffScheduleContent />
    </Suspense>
  );
}

function StaffScheduleContent() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const month = search.month ?? currentYearMonth("UTC");
  const scheduleQuery = useSuspenseQuery(myScheduleQueryOptions({ month }));

  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="My schedule"
        description="Published shifts this month, in each restaurant's timezone."
      />

      <PersonMonthCalendar
        schedule={scheduleQuery.data}
        onMonthChange={(nextMonth) => void navigate({ search: { month: nextMonth } })}
      />
    </div>
  );
}
