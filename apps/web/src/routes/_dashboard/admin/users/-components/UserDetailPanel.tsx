import { Skeleton } from "@/components/ui/skeleton";
import { teamMemberQueryOptions } from "@/data-access-layer/team/team.queries";
import { ROLE } from "@/lib/better-auth/roles";
import { formatDate } from "@/utils/date";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { DashboardPageHeader } from "../../../-components/DashboardPageHeader";
import { UserScheduleSection } from "../../../-components/schedule/PersonMonthCalendar";

type UserDetailPanelProps = {
  userId: string;
  expectedRole?: typeof ROLE.manager | typeof ROLE.staff;
  roleLabel: (role: typeof ROLE.manager | typeof ROLE.staff) => string;
};

function roleBadgeClass(role: typeof ROLE.manager | typeof ROLE.staff) {
  if (role === ROLE.manager) {
    return "bg-flag-blue-soft text-flag-blue";
  }
  return "bg-base-content/8 text-base-content/70";
}

export function UserDetailPanel({ userId, expectedRole, roleLabel }: UserDetailPanelProps) {
  const { data: member, isPending, isError, error } = useQuery(
    teamMemberQueryOptions({ userId, role: expectedRole }),
  );

  if (isPending) {
    return <UserDetailSkeleton />;
  }

  if (isError || !member) {
    return (
      <div className="border-base-content/10 bg-base-100/50 rounded-2xl border px-6 py-10 text-center">
        <p className="text-base-content/70 text-sm">
          {error instanceof Error ? error.message : "User not found."}
        </p>
      </div>
    );
  }

  return (
    <>
      <DashboardPageHeader
        title={member.name}
        description={member.email}
        actions={
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${roleBadgeClass(member.role as typeof ROLE.manager | typeof ROLE.staff)}`}
          >
            {roleLabel(member.role as typeof ROLE.manager | typeof ROLE.staff)}
          </span>
        }
      />

      <p className="text-base-content/60 -mt-4 text-sm">
        Joined {formatDate(member.createdAt)}
        {member.role === ROLE.staff ? (
          <>
            {" · "}
            Right-click a date to assign a location shift
          </>
        ) : null}
      </p>

      <Suspense fallback={<UserDetailSkeleton />}>
        <UserScheduleSection userId={userId} />
      </Suspense>
    </>
  );
}

function UserDetailSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="border-base-content/10 rounded-2xl border p-6">
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="border-base-content/10 rounded-2xl border p-6">
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
