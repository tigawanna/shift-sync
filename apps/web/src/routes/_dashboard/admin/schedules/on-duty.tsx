import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { adminOnDutyNowQueryOptions } from "../-data-access-layer/admin-schedules.query-options";
import { ListOnDuty } from "./-components/ListOnDuty";

const onDutySearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
  locationId: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/admin/schedules/on-duty")({
  validateSearch: onDutySearchSchema,
  loaderDeps: ({ search }) => ({
    page: search.page,
    perPage: search.perPage,
    sq: search.sq,
    locationId: search.locationId,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      adminOnDutyNowQueryOptions({
        page: deps.page,
        perPage: deps.perPage,
        sq: deps.sq,
        locationId: deps.locationId,
      }),
    );
  },
  component: AdminOnDutyPage,
  pendingComponent: RouterPendingComponent,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | On duty` }],
  }),
});

function AdminOnDutyPage() {
  return (
    <Suspense fallback={<RouterPendingComponent />}>
      <ListOnDuty />
    </Suspense>
  );
}
