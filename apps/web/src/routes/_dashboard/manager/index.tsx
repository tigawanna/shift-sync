import { ROLE, getHomePathForRole, getUserAppRole } from "@/lib/better-auth/roles";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/manager/")({
  beforeLoad: ({ context }) => {
    const role = getUserAppRole(context.viewer?.user);
    if (role !== ROLE.admin && role !== ROLE.manager) {
      throw redirect({ to: getHomePathForRole(role) });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_dashboard/manager/"!</div>;
}
