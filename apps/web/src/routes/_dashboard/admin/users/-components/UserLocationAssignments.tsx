import type { TeamMemberLocation } from "@/data-access-layer/team/team.types";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTeamMemberLocations } from "@/data-access-layer/team/team.functions";
import { teamMemberQueryOptions } from "@/data-access-layer/team/team.queries";
import { toast } from "sonner";

type UserLocationEditorProps = {
  userId: string;
  savedLocationIds: string[];
  allLocations: TeamMemberLocation[];
  locationsPending: boolean;
};

export function UserLocationEditor({
  userId,
  savedLocationIds,
  allLocations,
  locationsPending: isLoading,
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
  function onSave() {
    saveMutation.mutate(selectedLocationIds);
  }
  const isSaving = saveMutation.isPending;
  if (isLoading) {
    return (
      <UserLocationEditorScafold>
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
      <UserLocationEditorScafold>
        <p className="text-base-content/70 text-sm">No locations exist yet. Create one first.</p>
      </UserLocationEditorScafold>
    );
  }

  return (
    <UserLocationEditorScafold>
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
          disabled={!hasChanges || isSaving || isLoading}
          onClick={onSave}
        >
          {isSaving ? "Saving…" : "Save assignments"}
        </button>
        <p className="text-base-content/50 self-center text-xs">
          {selectedLocationIds.length} location{selectedLocationIds.length === 1 ? "" : "s"}{" "}
          selected
        </p>
      </div>
    </UserLocationEditorScafold>
  );
}

interface UserLocationEditorScafoldProps {
  children: React.ReactNode;
}
function UserLocationEditorScafold({ children }: UserLocationEditorScafoldProps) {
  return (
    <section
      className="border-base-content/10 bg-base-100/70 flex flex-col gap-4 rounded-2xl border p-6"
      data-test="user-location-assignments"
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Location assignments</h2>
        <p className="text-base-content/70 mt-1 text-sm">
          Choose which Coastal Eats locations this person can work at or manage.
        </p>
      </div>
      {children}
    </section>
  );
}
