import { ROLE, getHomePathForRole, getUserAppRole } from "@/lib/better-auth/roles";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/staff")({
  beforeLoad: ({ context }) => {
    const role = getUserAppRole(context.viewer?.user);
    if (role !== ROLE.staff) {
      throw redirect({ to: getHomePathForRole(role) });
    }
  },
  component: StaffLayout,
});

function StaffLayout() {
  return <Outlet />;
}
