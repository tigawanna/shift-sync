import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { currentYearMonth } from "@/lib/time/zoned";
import { AppConfig } from "@/utils/system";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import {
  adminStaffQueryOptions,
  skillOptionsQueryOptions,
} from "../-data-access-layer/staff.query-options";
import { locationOptionsQueryOptions } from "../-data-access-layer/locations.query-options";
import {
  adminStaffAvailabilityQueryOptions,
  adminStaffDesiredHoursQueryOptions,
  adminStaffScheduleQueryOptions,
} from "../-data-access-layer/staff-calendar.query-options";
import { AdminStaffCalendar } from "./-components/AdminStaffCalendar";
import { StaffDirectorySheet } from "./-components/StaffDirectorySheet";

const staffDetailSearchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export const Route = createFileRoute("/_dashboard/admin/staff/$staffId")({
  params: {
    parse: (params) => ({ staffId: z.string().min(1).parse(params.staffId) }),
  },
  validateSearch: staffDetailSearchSchema,
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: async ({ context, params, deps }) => {
    const month = deps.month ?? currentYearMonth("UTC");
    await Promise.allSettled([
      context.queryClient.ensureQueryData(adminStaffQueryOptions(params.staffId)),
      context.queryClient.ensureQueryData(
        adminStaffScheduleQueryOptions({ userId: params.staffId, month }),
      ),
      context.queryClient.ensureQueryData(
        adminStaffAvailabilityQueryOptions({ userId: params.staffId, month }),
      ),
      context.queryClient.ensureQueryData(
        adminStaffDesiredHoursQueryOptions({ userId: params.staffId, month }),
      ),
      context.queryClient.ensureQueryData(locationOptionsQueryOptions()),
      context.queryClient.ensureQueryData(skillOptionsQueryOptions()),
    ]);
  },
  component: AdminStaffDetailPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Staff` }],
  }),
});

function AdminStaffDetailPage() {
  const { staffId } = Route.useParams();
  const { data: staff } = useSuspenseQuery(adminStaffQueryOptions(staffId));
  const [directoryOpen, setDirectoryOpen] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title={staff.name}
        description={`${staff.email}. Calendar is read-only here — ask a manager if an assignment should change.`}
        actions={
          <>
            <Link
              to="/admin/staff"
              search={{ page: 1, perPage: ADMIN_LIST_PER_PAGE, sq: "" }}
              className="btn btn-ghost btn-sm"
            >
              All staff
            </Link>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setDirectoryOpen(true)}
            >
              Skills & certs
            </button>
          </>
        }
      />
      <AdminStaffCalendar staffId={staff.id} staffName={staff.name} />
      <StaffDirectorySheet
        staff={directoryOpen ? staff : null}
        onClose={() => setDirectoryOpen(false)}
      />
    </div>
  );
}
