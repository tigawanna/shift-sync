import { allLocationsForAssignmentQueryOptions } from "@/data-access-layer/location/location.queries";
import { teamMemberQueryOptions } from "@/data-access-layer/team/team.queries";
import { ROLE } from "@/lib/better-auth/roles";
import { AppConfig } from "@/utils/system";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { UserDetailPanel } from "../-components/UserDetailPanel";

export const Route = createFileRoute("/_dashboard/admin/users/$userId/")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(teamMemberQueryOptions({ userId: params.userId })),
      context.queryClient.ensureQueryData(allLocationsForAssignmentQueryOptions()),
    ]);
  },
  component: AdminUserDetailPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | User` }],
  }),
});

function roleLabel(role: typeof ROLE.manager | typeof ROLE.staff) {
  return role === ROLE.manager ? "Manager" : "Staff";
}

function AdminUserDetailPage() {
  const { userId } = Route.useParams();

  return (
    <div className="flex flex-col gap-8">
      <Link
        to="/admin/users"
        className="text-base-content/60 hover:text-base-content inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to users
      </Link>

      <UserDetailPanel userId={userId} roleLabel={roleLabel} />
    </div>
  );
}
