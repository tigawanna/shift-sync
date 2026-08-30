import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { locationOptionsQueryOptions } from "../-data-access-layer/locations.query-options";
import {
  listStaffQueryOptions,
  skillOptionsQueryOptions,
} from "../-data-access-layer/staff.query-options";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { StaffList } from "./-components/StaffList";
import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";

const staffSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
  locationId: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/admin/staff/")({
  validateSearch: (search) => staffSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    page: search.page,
    perPage: search.perPage,
    sq: search.sq,
    locationId: search.locationId,
  }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        listStaffQueryOptions({
          page: deps.page,
          perPage: deps.perPage,
          sq: deps.sq,
          locationId: deps.locationId,
        }),
      ),
      context.queryClient.ensureQueryData(locationOptionsQueryOptions()),
      context.queryClient.ensureQueryData(skillOptionsQueryOptions()),
    ]);
  },
  component: AdminStaffPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Staff` }],
  }),
});

function AdminStaffPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Staff"
        description="People who can be scheduled across locations."
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <StaffList />
      </Suspense>
    </div>
  );
}
