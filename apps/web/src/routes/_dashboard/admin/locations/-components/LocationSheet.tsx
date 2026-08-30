import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createLocation,
  LOCATION_TIMEZONES,
  updateLocation,
  type LocationListItem,
} from "../../-data-access-layer/locations.fn";

export type LocationSheetPanel = { kind: "create" } | { kind: "edit"; location: LocationListItem };

function timezoneSelectOptions(current: string) {
  if ((LOCATION_TIMEZONES as readonly string[]).includes(current)) {
    return [...LOCATION_TIMEZONES];
  }
  return [current, ...LOCATION_TIMEZONES];
}

export function LocationSheet({
  panel,
  onClose,
}: {
  panel: LocationSheetPanel | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!panel) return;
    if (panel.kind === "create") {
      setName("");
      setTimezone("America/Los_Angeles");
      setAddress("");
      return;
    }
    setName(panel.location.name);
    setTimezone(panel.location.timezone);
    setAddress(panel.location.address ?? "");
  }, [panel]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        timezone: timezone as (typeof LOCATION_TIMEZONES)[number],
        address: address.trim() || undefined,
      };
      if (panel?.kind === "create") {
        return createLocation({ data: payload });
      }
      if (panel?.kind !== "edit") throw new Error("Nothing to save.");
      return updateLocation({ data: { locationId: panel.location.id, ...payload } });
    },
    onSuccess: async () => {
      toast.success(panel?.kind === "create" ? "Location added." : "Location updated.");
      onClose();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-locations"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-location-options"] }),
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save this location.");
    },
  });

  return (
    <Sheet open={Boolean(panel)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{panel?.kind === "edit" ? "Edit location" : "Add location"}</SheetTitle>
          <SheetDescription>
            Times at this restaurant always follow the timezone you set here.
          </SheetDescription>
        </SheetHeader>
        {panel ? (
          <form
            className="flex flex-col gap-4 px-4 pb-8"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground text-xs">Name</span>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                data-test="admin-location-name"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground text-xs">Timezone</span>
              <select
                className="select-bordered select select-sm"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                required
                data-test="admin-location-timezone"
              >
                {timezoneSelectOptions(timezone).map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground text-xs">Address</span>
              <Input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                data-test="admin-location-address"
              />
            </label>
            <button
              type="submit"
              className="btn btn-primary btn-sm w-fit"
              disabled={save.isPending}
              data-test="admin-save-location"
            >
              {panel.kind === "create" ? "Add location" : "Save changes"}
            </button>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
