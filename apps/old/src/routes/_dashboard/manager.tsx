import { ROLE, getHomePathForRole, getUserAppRole } from "@/lib/better-auth/roles";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/manager")({
  beforeLoad: ({ context }) => {
    const role = getUserAppRole(context.viewer?.user);
    if (role !== ROLE.manager) {
      throw redirect({ to: getHomePathForRole(role) });
    }
  },
  component: ManagerLayout,
});

function ManagerLayout() {
  return <Outlet />;
}
