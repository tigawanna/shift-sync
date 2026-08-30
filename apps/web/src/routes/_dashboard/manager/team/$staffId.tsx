import { currentYearMonth } from "@/lib/time/zoned";
import { AppConfig } from "@/utils/system";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import {
  managerStaffAvailabilityQueryOptions,
  managerStaffDesiredHoursQueryOptions,
  managerStaffQueryOptions,
  managerStaffScheduleQueryOptions,
} from "../-data-access-layer/manager-staff-calendar.query-options";
import { ManagerStaffCalendar } from "./-components/ManagerStaffCalendar";

const staffDetailSearchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export const Route = createFileRoute("/_dashboard/manager/team/$staffId")({
  params: {
    parse: (params) => ({ staffId: z.string().min(1).parse(params.staffId) }),
  },
  validateSearch: staffDetailSearchSchema,
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: async ({ context, params, deps }) => {
    const month = deps.month ?? currentYearMonth("UTC");
    await Promise.allSettled([
      context.queryClient.ensureQueryData(managerStaffQueryOptions(params.staffId)),
      context.queryClient.ensureQueryData(
        managerStaffScheduleQueryOptions({ userId: params.staffId, month }),
      ),
      context.queryClient.ensureQueryData(
        managerStaffAvailabilityQueryOptions({ userId: params.staffId, month }),
      ),
      context.queryClient.ensureQueryData(
        managerStaffDesiredHoursQueryOptions({ userId: params.staffId, month }),
      ),
    ]);
  },
  component: ManagerStaffDetailPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Team` }],
  }),
});

function ManagerStaffDetailPage() {
  const { staffId } = Route.useParams();
  const { data: staff } = useSuspenseQuery(managerStaffQueryOptions(staffId));

  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title={staff.name}
        description={`${staff.email}. Click a shift to open that location-week.`}
        actions={
          <Link to="/manager/team" className="btn btn-ghost btn-sm">
            All team
          </Link>
        }
      />
      <ManagerStaffCalendar staffId={staff.id} />
    </div>
  );
}
