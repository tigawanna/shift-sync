import { ROLE, getHomePathForRole, getUserAppRole } from "@/lib/better-auth/roles";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/admin")({
  beforeLoad: ({ context }) => {
    const role = getUserAppRole(context.viewer?.user);
    if (role !== ROLE.admin) {
      throw redirect({ to: getHomePathForRole(role) });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}
