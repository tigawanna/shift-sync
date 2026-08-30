import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { defaultWeekStartYmd } from "@/lib/schedule/oversight";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import {
  adminLocationWeeksQueryOptions,
  adminOnDutyNowQueryOptions,
  adminWhoWorksWhereQueryOptions,
} from "../-data-access-layer/admin-schedules.query-options";
import { AdminSchedules } from "./-components/AdminSchedules";

const schedulesSearchSchema = z.object({
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .default(() => defaultWeekStartYmd()),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
  locationId: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/admin/schedules/")({
  validateSearch: schedulesSearchSchema,
  loaderDeps: ({ search }) => ({
    weekStart: search.weekStart,
    page: search.page,
    perPage: search.perPage,
    sq: search.sq,
    locationId: search.locationId,
  }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(adminOnDutyNowQueryOptions()),
      context.queryClient.ensureQueryData(adminLocationWeeksQueryOptions(deps.weekStart)),
      context.queryClient.ensureQueryData(
        adminWhoWorksWhereQueryOptions({
          weekStart: deps.weekStart,
          page: deps.page,
          perPage: deps.perPage,
          sq: deps.sq,
          locationId: deps.locationId,
        }),
      ),
    ]);
  },
  component: AdminSchedulesPage,
  pendingComponent: RouterPendingComponent,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Schedules` }],
  }),
});

function AdminSchedulesPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Schedules"
        description="Who is working where this week, overtime for any location, and who is on duty now."
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <AdminSchedules />
      </Suspense>
    </div>
  );
}
