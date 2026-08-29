import { userScheduleQueryOptions } from "@/data-access-layer/schedule/schedule.queries";
import { teamMemberQueryOptions } from "@/data-access-layer/team/team.queries";
import { allLocationsForAssignmentQueryOptions } from "@/data-access-layer/location/location.queries";
import { ROLE } from "@/lib/better-auth/roles";
import { currentYearMonth } from "@/lib/time/zoned";
import { AppConfig } from "@/utils/system";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { UserDetailPanel } from "../../users/-components/UserDetailPanel";

export const Route = createFileRoute("/_dashboard/admin/managers/$userId/")({
  loader: async ({ context, params }) => {
    const month = currentYearMonth("UTC");
    await Promise.all([
      context.queryClient.ensureQueryData(
        teamMemberQueryOptions({ userId: params.userId, role: ROLE.manager }),
      ),
      context.queryClient.ensureQueryData(
        userScheduleQueryOptions({ userId: params.userId, month }),
      ),
      context.queryClient.ensureQueryData(allLocationsForAssignmentQueryOptions()),
    ]);
  },
  component: AdminManagerDetailPage,
  head: () => ({
    meta: [{ title: `${AppConfig.name} | Manager` }],
  }),
});

function roleLabel(role: typeof ROLE.manager | typeof ROLE.staff) {
  return role === ROLE.manager ? "Manager" : "Staff";
}

function AdminManagerDetailPage() {
  const { userId } = Route.useParams();

  return (
    <div className="flex flex-col gap-8">
      <Link
        to="/admin/managers"
        className="text-base-content/60 hover:text-base-content inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to managers
      </Link>

      <UserDetailPanel userId={userId} expectedRole={ROLE.manager} roleLabel={roleLabel} />
    </div>
  );
}
