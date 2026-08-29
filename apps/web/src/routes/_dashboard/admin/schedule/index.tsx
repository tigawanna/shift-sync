import { accessibleLocationsQueryOptions } from "@/data-access-layer/location/location.queries";
import {
  monthOverviewQueryOptions,
  overviewDayQueryOptions,
} from "@/data-access-layer/schedule/schedule.queries";
import { currentYearMonth } from "@/lib/time/zoned";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { ScheduleBirdsEye } from "../../-components/schedule/ScheduleBirdsEye";

const adminScheduleSearchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const Route = createFileRoute("/_dashboard/admin/schedule/")({
  validateSearch: (search) => adminScheduleSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({ month: search.month, date: search.date }),
  loader: async ({ context, deps }) => {
    const month = deps.month ?? currentYearMonth("UTC");
    await Promise.all([
      context.queryClient.ensureQueryData(accessibleLocationsQueryOptions()),
      context.queryClient.ensureQueryData(monthOverviewQueryOptions({ month })),
      deps.date
        ? context.queryClient.ensureQueryData(overviewDayQueryOptions({ date: deps.date }))
        : Promise.resolve(),
    ]);
  },
  component: AdminSchedulePage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Company schedule` }],
  }),
});

function AdminSchedulePage() {
  return (
    <Suspense fallback={<RouterPendingComponent />}>
      <AdminScheduleContent />
    </Suspense>
  );
}

function AdminScheduleContent() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const month = search.month ?? currentYearMonth("UTC");
  useSuspenseQuery(accessibleLocationsQueryOptions());

  return (
    <ScheduleBirdsEye
      month={month}
      selectedDate={search.date}
      onMonthChange={(nextMonth) => void navigate({ search: { month: nextMonth } })}
      onSelectDate={(date) => void navigate({ search: { month, date } })}
      title="Company schedule"
      description="How many people are working each day. Open a date, then a restaurant, to see who is on and jump to their calendar."
      personTo="/admin/users/$userId"
    />
  );
}
