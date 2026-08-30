import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminIdChecklist } from "../../-components/AdminIdChecklist";
import { locationOptionsQueryOptions } from "../../-data-access-layer/locations.query-options";
import { setManagerLocations } from "../../-data-access-layer/managers.fn";
import { managerLocationsQueryOptions } from "../../-data-access-layer/managers.query-options";
import type { ManagerListItem } from "../../-data-access-layer/managers.fn";

export function ManagerLocationsSheet({
  manager,
  onClose,
}: {
  manager: ManagerListItem | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const userId = manager?.id ?? "";
  const locationsQuery = useQuery(locationOptionsQueryOptions());
  const assignedQuery = useQuery({
    ...managerLocationsQueryOptions(userId),
    enabled: Boolean(userId),
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!assignedQuery.data) return;
    setSelected(new Set(assignedQuery.data.locationIds));
  }, [assignedQuery.data]);

  const save = useMutation({
    mutationFn: () => {
      if (!manager) throw new Error("No manager selected.");
      return setManagerLocations({ data: { userId: manager.id, locationIds: [...selected] } });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-manager-locations"] }),
        queryClient.invalidateQueries({ queryKey: ["manager-locations"] }),
      ]);
      toast.success("Manager locations updated.");
      onClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update locations.");
    },
  });

  return (
    <Sheet open={Boolean(manager)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{manager ? `Locations for ${manager.name}` : "Locations"}</SheetTitle>
          <SheetDescription>
            Managers only see and schedule the restaurants checked here.
          </SheetDescription>
        </SheetHeader>
        {manager ? (
          <form
            className="flex flex-col gap-4 px-4 pb-8"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            {assignedQuery.isPending || locationsQuery.isPending ? (
              <p className="text-muted-foreground text-xs">Loading locations…</p>
            ) : (
              <AdminIdChecklist
                items={(locationsQuery.data ?? []).map((location) => ({
                  id: location.id,
                  label: location.name,
                  hint: location.timezone,
                }))}
                selected={selected}
                onToggle={(id, next) => {
                  setSelected((current) => {
                    const nextSet = new Set(current);
                    if (next) nextSet.add(id);
                    else nextSet.delete(id);
                    return nextSet;
                  });
                }}
                emptyLabel="Add a location first."
              />
            )}
            <button
              type="submit"
              className="btn btn-primary btn-sm w-fit"
              disabled={save.isPending || assignedQuery.isPending}
              data-test="admin-save-manager-locations"
            >
              Save locations
            </button>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
