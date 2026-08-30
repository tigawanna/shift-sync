import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { AppConfig } from "@/utils/system";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { DashboardPageHeader } from "../../-components/DashboardPageHeader";
import { ImpersonateUserButton } from "../../-components/ImpersonateUserButton";
import {
  adminManagerHomeQueryOptions,
  adminManagerQueryOptions,
} from "../-data-access-layer/managers.query-options";
import { AdminManagerOverview } from "./-components/AdminManagerOverview";

export const Route = createFileRoute("/_dashboard/admin/managers/$managerId")({
  params: {
    parse: (params) => ({ managerId: z.string().min(1).parse(params.managerId) }),
  },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(adminManagerQueryOptions(params.managerId)),
      context.queryClient.ensureQueryData(adminManagerHomeQueryOptions(params.managerId)),
    ]);
  },
  component: AdminManagerDetailPage,
  pendingComponent: RouterPendingComponent,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Manager` }],
  }),
});

function AdminManagerDetailPage() {
  const { managerId } = Route.useParams();
  const { data: manager } = useSuspenseQuery(adminManagerQueryOptions(managerId));

  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title={manager.name}
        description={`${manager.email}. Same team, locations, and live shifts they see as a manager.`}
        actions={
          <>
            <Link
              to="/admin/managers"
              search={{ page: 1, perPage: ADMIN_LIST_PER_PAGE, sq: "" }}
              className="btn btn-ghost btn-sm"
            >
              All managers
            </Link>
            <ImpersonateUserButton user={manager} />
          </>
        }
      />
      <Suspense fallback={<RouterPendingComponent />}>
        <AdminManagerOverview managerId={manager.id} />
      </Suspense>
    </div>
  );
}
