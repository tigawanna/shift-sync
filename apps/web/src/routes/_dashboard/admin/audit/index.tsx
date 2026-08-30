import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { HQ_TIMEZONE } from "@/lib/schedule/oversight";
import { addDaysYmd, formatDateInZone } from "@/lib/time/zoned";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { listAdminAuditQueryOptions } from "../-data-access-layer/admin-audit.query-options";
import { locationOptionsQueryOptions } from "../-data-access-layer/locations.query-options";
import { ListAudit } from "./-components/ListAudit";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const auditSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
  locationId: z.string().optional(),
  from: ymd.optional().default(() => addDaysYmd(formatDateInZone(new Date(), HQ_TIMEZONE), -14)),
  to: ymd.optional().default(() => formatDateInZone(new Date(), HQ_TIMEZONE)),
});

export const Route = createFileRoute("/_dashboard/admin/audit/")({
  validateSearch: auditSearchSchema,
  loaderDeps: ({ search }) => ({
    page: search.page,
    perPage: search.perPage,
    sq: search.sq,
    locationId: search.locationId,
    from: search.from,
    to: search.to,
  }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(listAdminAuditQueryOptions(deps)),
      context.queryClient.ensureQueryData(locationOptionsQueryOptions()),
    ]);
  },
  component: AdminAuditPage,
  pendingComponent: RouterPendingComponent,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Audit` }],
  }),
});

function AdminAuditPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Audit"
        description="Every schedule write: who, when, before, and after. Export a CSV for a date range and location."
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <ListAudit />
      </Suspense>
    </div>
  );
}
