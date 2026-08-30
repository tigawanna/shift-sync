import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { locationOptionsQueryOptions } from "../-data-access-layer/locations.query-options";
import { listManagersQueryOptions } from "../-data-access-layer/managers.query-options";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { ManagerList } from "./-components/ManagerList";
import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";

const managersSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
});

export const Route = createFileRoute("/_dashboard/admin/managers/")({
  validateSearch: (search) => managersSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    page: search.page,
    perPage: search.perPage,
    sq: search.sq,
  }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        listManagersQueryOptions({
          page: deps.page,
          perPage: deps.perPage,
          sq: deps.sq,
        }),
      ),
      context.queryClient.ensureQueryData(locationOptionsQueryOptions()),
    ]);
  },
  component: AdminManagersPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Managers` }],
  }),
});

function AdminManagersPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Managers"
        description="Location managers who stay in their own dashboard."
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <ManagerList />
      </Suspense>
    </div>
  );
}
