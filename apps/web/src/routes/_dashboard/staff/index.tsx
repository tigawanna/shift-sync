import { ROLE, getHomePathForRole, getUserAppRole } from "@/lib/better-auth/roles";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/staff/")({
  beforeLoad: ({ context }) => {
    const role = getUserAppRole(context.viewer?.user);
    if (role !== ROLE.staff && role !== ROLE.admin) {
      throw redirect({ to: getHomePathForRole(role) });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_dashboard/staff/"!</div>;
}
