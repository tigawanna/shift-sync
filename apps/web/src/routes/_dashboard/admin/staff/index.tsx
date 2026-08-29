import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { listStaffQueryOptions } from "../-data-access-layer/staff.query-options";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { StaffList } from "./-components/StaffList";

const staffSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/admin/staff/")({
  validateSearch: (search) => staffSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    page: search.page,
    q: search.q,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      listStaffQueryOptions({
        page: deps.page,
        q: deps.q,
      }),
    );
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
