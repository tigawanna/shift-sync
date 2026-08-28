import type { TeamMemberLocation } from "@/data-access-layer/team/team.types";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";

type UserLocationAssignmentsProps = {
  allLocations: TeamMemberLocation[];
  selectedLocationIds: string[];
  isLoading: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  onToggle: (locationId: string) => void;
  onSave: () => void;
};

export function UserLocationAssignments({
  allLocations,
  selectedLocationIds,
  isLoading,
  isSaving,
  hasChanges,
  onToggle,
  onSave,
}: UserLocationAssignmentsProps) {
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

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : allLocations.length === 0 ? (
        <p className="text-base-content/70 text-sm">No locations exist yet. Create one first.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {allLocations.map((location) => {
            const checked = selectedLocationIds.includes(location.id);

            return (
              <li key={location.id}>
                <label
                  className={`border-base-content/10 hover:border-base-content/20 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${checked ? "bg-base-300/40" : "bg-base-100/50"}`}
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm mt-0.5"
                    checked={checked}
                    onChange={() => onToggle(location.id)}
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
      )}

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
          {selectedLocationIds.length} location{selectedLocationIds.length === 1 ? "" : "s"} selected
        </p>
      </div>
    </section>
  );
}
