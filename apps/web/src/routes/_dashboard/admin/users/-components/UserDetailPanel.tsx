import { Skeleton } from "@/components/ui/skeleton";
import { allLocationsForAssignmentQueryOptions } from "@/data-access-layer/location/location.queries";
import { teamMemberQueryOptions } from "@/data-access-layer/team/team.queries";
import type { TeamMemberLocation } from "@/data-access-layer/team/team.types";
import { ROLE } from "@/lib/better-auth/roles";
import { formatDate } from "@/utils/date";
import { useQuery } from "@tanstack/react-query";
import { DashboardPageHeader } from "../../../-components/DashboardPageHeader";
import { UserLocationEditor } from "./UserLocationAssignments";

type UserDetailPanelProps = {
  userId: string;
  roleLabel: (role: typeof ROLE.manager | typeof ROLE.staff) => string;
};

function roleBadgeClass(role: typeof ROLE.manager | typeof ROLE.staff) {
  if (role === ROLE.manager) {
    return "bg-flag-blue-soft text-flag-blue";
  }
  return "bg-base-content/8 text-base-content/70";
}

export function UserDetailPanel({ userId, roleLabel }: UserDetailPanelProps) {
  const { data: member, isPending, isError, error } = useQuery(teamMemberQueryOptions({ userId }));
  const { data: allLocations, isPending: locationsPending } = useQuery(
    allLocationsForAssignmentQueryOptions(),
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

      <section className="border-base-content/10 bg-base-100/70 grid gap-4 rounded-2xl border p-6 sm:grid-cols-2">
        <div>
          <p className="text-base-content/60 text-xs tracking-wide uppercase">Email</p>
          <p className="mt-1 text-sm font-medium">{member.email}</p>
        </div>
        <div>
          <p className="text-base-content/60 text-xs tracking-wide uppercase">Joined</p>
          <p className="mt-1 text-sm font-medium">{formatDate(member.createdAt)}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-base-content/60 text-xs tracking-wide uppercase">Current locations</p>
          <p className="mt-1 text-sm">
            {member.locations.length > 0
              ? member.locations.map((location: TeamMemberLocation) => location.name).join(", ")
              : "Not assigned to any location"}
          </p>
        </div>
      </section>

      <UserLocationEditor
        key={userId}
        userId={userId}
        savedLocationIds={member.locations.map((location) => location.id)}
        allLocations={allLocations ?? []}
        locationsPending={locationsPending}
      />
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
