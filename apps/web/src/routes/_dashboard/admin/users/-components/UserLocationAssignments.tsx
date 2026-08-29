import type { TeamMemberLocation } from "@/data-access-layer/team/team.types";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { locationMovePreviewQueryOptions } from "@/data-access-layer/schedule/schedule.queries";
import { updateTeamMemberLocations } from "@/data-access-layer/team/team.functions";
import { teamMemberQueryOptions } from "@/data-access-layer/team/team.queries";
import { mondayOfWeekContaining } from "@/lib/time/zoned";
import { MapPin } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type UserLocationEditorProps = {
  userId: string;
  savedLocationIds: string[];
  savedLocationNames: string[];
  allLocations: TeamMemberLocation[];
  locationsPending: boolean;
};

export function UserLocationEditor({
  userId,
  savedLocationIds,
  savedLocationNames,
  allLocations,
  locationsPending: isLoading,
}: UserLocationEditorProps) {
  const qc = useQueryClient();
  const [selectedLocationIds, setSelectedLocationIds] = useState(savedLocationIds);
  const weekStart = mondayOfWeekContaining(new Date(), "UTC");
  const previewQuery = useQuery(
    locationMovePreviewQueryOptions({
      userId,
      locationIds: selectedLocationIds,
      weekStart,
    }),
  );

  const saveMutation = useMutation({
    mutationFn: async (locationIds: string[]) => {
      return updateTeamMemberLocations({ data: { userId, locationIds } });
    },
    onSuccess: async (updated) => {
      qc.setQueryData(teamMemberQueryOptions({ userId }).queryKey, updated);
      await qc.invalidateQueries({ queryKey: ["locations"] });
      await qc.invalidateQueries({ queryKey: ["schedule"] });
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
  function onSave() {
    saveMutation.mutate(selectedLocationIds);
  }
  const isSaving = saveMutation.isPending;
  if (isLoading) {
    return (
      <UserLocationEditorScafold summary={savedLocationNames.join(", ")}>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </UserLocationEditorScafold>
    );
  }
  if (allLocations.length === 0) {
    return (
      <UserLocationEditorScafold summary={savedLocationNames.join(", ")}>
        <p className="text-base-content/70 text-sm">No locations exist yet. Create one first.</p>
      </UserLocationEditorScafold>
    );
  }

  return (
    <UserLocationEditorScafold summary={savedLocationNames.join(", ")}>
      <ul className="flex flex-col gap-2">
        {allLocations.map((location) => {
          const checked = selectedLocationIds.includes(location.id);

          return (
            <li key={location.id}>
              <label
                className={`border-base-content/10 hover:border-base-content/20 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${checked ? "bg-base-300/40" : "bg-base-100/50"}`}
              >
                <Checkbox
                  className="mt-0.5 ring-primary"
                  checked={checked}
                  onCheckedChange={() => toggleLocation(location.id)}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <MapPin className="text-base-content/50 size-3.5 shrink-0" />
                    {location.name}
                  </span>
                  <span className="text-base-content/60 text-xs">{location.timezone}</span>
                  {location.address ? (
                    <span className="text-base-content/50 text-xs">{location.address}</span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!hasChanges || isSaving || isLoading || previewQuery.data?.canSave === false}
          onClick={onSave}
        >
          {isSaving ? "Saving…" : "Save assignments"}
        </button>
        <p className="text-base-content/50 self-center text-xs">
          {selectedLocationIds.length} location{selectedLocationIds.length === 1 ? "" : "s"}{" "}
          selected
        </p>
      </div>
      {previewQuery.isPending ? (
        <p className="text-base-content/50 text-sm">Checking remaining hours in SQL…</p>
      ) : null}
      {previewQuery.isError ? (
        <p className="text-error text-sm">
          {previewQuery.error instanceof Error
            ? previewQuery.error.message
            : "Could not preview this location change."}
        </p>
      ) : null}
      {previewQuery.data ? (
        <div className="text-sm">
          <p>
            Remaining scheduled hours this week:{" "}
            <span className="font-medium tabular-nums">
              {previewQuery.data.weeklyHoursAfter.toFixed(1)}
            </span>
          </p>
          {previewQuery.data.warnings.map((warning) => (
            <p key={warning} className="text-warning mt-1">
              {warning}
            </p>
          ))}
          {previewQuery.data.blockingShifts.length > 0 ? (
            <p className="text-error mt-1">
              Upcoming shifts still at a location you would remove:{" "}
              {previewQuery.data.blockingShifts.map((shift) => shift.locationName).join(", ")}.
              Reassign those shifts before moving them.
            </p>
          ) : null}
        </div>
      ) : null}
    </UserLocationEditorScafold>
  );
}

interface UserLocationEditorScafoldProps {
  children: React.ReactNode;
  summary?: string;
}
function UserLocationEditorScafold({ children, summary }: UserLocationEditorScafoldProps) {
  return (
    <details
      className="border-base-content/10 bg-base-100/70 rounded-2xl border"
      data-test="user-location-assignments"
    >
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
        Locations
        {summary ? (
          <span className="text-base-content/50 font-normal"> · {summary}</span>
        ) : (
          <span className="text-base-content/50 font-normal"> · not assigned</span>
        )}
      </summary>
      <div className="flex flex-col gap-4 px-5 pb-5">
        <p className="text-base-content/70 text-sm">
          Choose which Coastal Eats locations this person can work at or manage.
        </p>
        {children}
      </div>
    </details>
  );
}
