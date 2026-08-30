import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { listAdminsQueryOptions } from "../-data-access-layer/admins.query-options";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { AdminList } from "./-components/AdminList";

const adminsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
  locationId: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/admin/admins/")({
  validateSearch: (search) => adminsSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    page: search.page,
    perPage: search.perPage,
    sq: search.sq,
    locationId: search.locationId,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      listAdminsQueryOptions({
        page: deps.page,
        perPage: deps.perPage,
        sq: deps.sq,
        locationId: deps.locationId,
      }),
    );
  },
  component: AdminAdminsPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Admins` }],
  }),
});

function AdminAdminsPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Admins"
        description="Corporate accounts with full access to ShiftSync."
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <AdminList />
      </Suspense>
    </div>
  );
}
