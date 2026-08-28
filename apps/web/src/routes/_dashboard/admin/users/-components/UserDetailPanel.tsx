import { allLocationsForAssignmentQueryOptions } from "@/data-access-layer/location/location.queries";
import { updateTeamMemberLocations } from "@/data-access-layer/team/team.functions";
import { teamMemberQueryOptions } from "@/data-access-layer/team/team.queries";
import type { TeamMemberLocation } from "@/data-access-layer/team/team.types";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE } from "@/lib/better-auth/roles";
import { formatDate } from "@/utils/date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardPageHeader } from "../../../-components/DashboardPageHeader";
import { UserLocationAssignments } from "./UserLocationAssignments";

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
          <p className="text-base-content/60 text-xs uppercase tracking-wide">Email</p>
          <p className="mt-1 text-sm font-medium">{member.email}</p>
        </div>
        <div>
          <p className="text-base-content/60 text-xs uppercase tracking-wide">Joined</p>
          <p className="mt-1 text-sm font-medium">{formatDate(member.createdAt)}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-base-content/60 text-xs uppercase tracking-wide">Current locations</p>
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

type UserLocationEditorProps = {
  userId: string;
  savedLocationIds: string[];
  allLocations: TeamMemberLocation[];
  locationsPending: boolean;
};

function UserLocationEditor({
  userId,
  savedLocationIds,
  allLocations,
  locationsPending,
}: UserLocationEditorProps) {
  const qc = useQueryClient();
  const [selectedLocationIds, setSelectedLocationIds] = useState(savedLocationIds);

  const saveMutation = useMutation({
    mutationFn: async (locationIds: string[]) => {
      return updateTeamMemberLocations({ data: { userId, locationIds } });
    },
    onSuccess: async (updated) => {
      qc.setQueryData(teamMemberQueryOptions({ userId }).queryKey, updated);
      await qc.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location assignments updated.");
    },
    onError: (saveError) => {
      toast.error(saveError instanceof Error ? saveError.message : "Could not save assignments.");
    },
  });

  const hasChanges =
    selectedLocationIds.length !== savedLocationIds.length ||
    selectedLocationIds.some((id) => !savedLocationIds.includes(id));

  function toggleLocation(locationId: string) {
    setSelectedLocationIds((current) =>
      current.includes(locationId)
        ? current.filter((id) => id !== locationId)
        : [...current, locationId],
    );
  }

  return (
    <UserLocationAssignments
      allLocations={allLocations}
      selectedLocationIds={selectedLocationIds}
      isLoading={locationsPending}
      isSaving={saveMutation.isPending}
      hasChanges={hasChanges}
      onToggle={toggleLocation}
      onSave={() => saveMutation.mutate(selectedLocationIds)}
    />
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
