import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { myNotificationsQueryOptions } from "../../-data-access-layer/notifications.query-options";
import { ListNotifications } from "./-components/ListNotifications";

const notificationsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
  unread: z.enum(["all", "unread"]).optional().default("all"),
});

export const Route = createFileRoute("/_dashboard/staff/notifications/")({
  validateSearch: notificationsSearchSchema,
  loaderDeps: ({ search }) => ({
    page: search.page,
    perPage: search.perPage,
    sq: search.sq,
    unread: search.unread,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(myNotificationsQueryOptions(deps));
  },
  component: StaffNotificationsPage,
  pendingComponent: RouterPendingComponent,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Notifications` }],
  }),
});

function StaffNotificationsPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Notifications"
        description="Schedule publishes, assignments, and every step of a swap or drop. Mark items read, or also simulate email."
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <ListNotifications />
      </Suspense>
    </div>
  );
}
