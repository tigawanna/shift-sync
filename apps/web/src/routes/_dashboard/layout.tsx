import { viewerMiddleware } from "@/data-access-layer/auth/viewer.middleware";
import {
  getHomePathForRole,
  getUserAppRole,
  isDashboardPathAllowedForRole,
} from "@/lib/better-auth/roles";
import { RouterNotFoundComponent } from "@/lib/tanstack/router/RouterNotFoundComponent";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { RouterErrorComponent } from "@/lib/tanstack/router/routerErrorComponent";
import { AppConfig } from "@/utils/system";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { DashboardLayout } from "./-components/dashboard-sidebar/DashboardLayout";
import { dashboard_account_routes } from "./-components/dashboard-sidebar/dashboard_routes";
import { useLivePulse } from "./-hooks/useLivePulse";

export const Route = createFileRoute("/_dashboard")({
  pendingComponent: RouterPendingComponent,
  notFoundComponent: () => <RouterNotFoundComponent />,
  errorComponent: ({ error, reset }) => <RouterErrorComponent error={error} reset={reset} />,
  component: DashboardShell,
  server: {
    middleware: [viewerMiddleware],
  },
  beforeLoad: ({ context, location }) => {
    if (!context.viewer?.user) {
      throw redirect({ to: "/auth", search: { returnTo: location.href } });
    }
    const role = getUserAppRole(context.viewer.user);
    if (!isDashboardPathAllowedForRole(location.pathname, role)) {
      throw redirect({ to: getHomePathForRole(role) });
    }
  },
  head: () => ({
    meta: [
      {
        title: `${AppConfig.name} | Dashboard`,
      },
    ],
  }),
});

function DashboardShell() {
  useLivePulse();

  return (
    <Suspense fallback={<RouterPendingComponent />}>
      <DashboardLayout
        sidebarLabel="Menu"
        accountRoutes={dashboard_account_routes}
        accountLabel="Account"
      />
    </Suspense>
  );
}
