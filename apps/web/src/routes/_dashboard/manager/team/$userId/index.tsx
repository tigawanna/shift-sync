import { teamMemberQueryOptions } from "@/data-access-layer/team/team.queries";
import { userScheduleQueryOptions } from "@/data-access-layer/schedule/schedule.queries";
import { ROLE } from "@/lib/better-auth/roles";
import { currentYearMonth } from "@/lib/time/zoned";
import { AppConfig } from "@/utils/system";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { UserDetailPanel } from "../../../admin/users/-components/UserDetailPanel";

export const Route = createFileRoute("/_dashboard/manager/team/$userId/")({
  loader: async ({ context, params }) => {
    const month = currentYearMonth("UTC");
    await Promise.all([
      context.queryClient.ensureQueryData(teamMemberQueryOptions({ userId: params.userId })),
      context.queryClient.ensureQueryData(
        userScheduleQueryOptions({ userId: params.userId, month }),
      ),
    ]);
  },
  component: ManagerTeamMemberPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Team member` }],
  }),
});

function roleLabel(role: typeof ROLE.manager | typeof ROLE.staff) {
  return role === ROLE.manager ? "Manager" : "Staff";
}

function ManagerTeamMemberPage() {
  const { userId } = Route.useParams();

  return (
    <div className="flex flex-col gap-8">
      <Link
        to="/manager/team"
        className="text-base-content/60 hover:text-base-content inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to team
      </Link>

      <UserDetailPanel userId={userId} roleLabel={roleLabel} />
    </div>
  );
}
