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
import { setStaffDirectory, type StaffListItem } from "../../-data-access-layer/staff.fn";
import {
  skillOptionsQueryOptions,
  staffDirectoryQueryOptions,
} from "../../-data-access-layer/staff.query-options";

export function StaffDirectorySheet({
  staff,
  onClose,
}: {
  staff: StaffListItem | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const userId = staff?.id ?? "";
  const locationsQuery = useQuery(locationOptionsQueryOptions());
  const skillsQuery = useQuery(skillOptionsQueryOptions());
  const directoryQuery = useQuery({
    ...staffDirectoryQueryOptions(userId),
    enabled: Boolean(userId),
  });
  const [skillIds, setSkillIds] = useState<Set<string>>(new Set());
  const [locationIds, setLocationIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!directoryQuery.data) return;
    setSkillIds(new Set(directoryQuery.data.skillIds));
    setLocationIds(new Set(directoryQuery.data.locationIds));
  }, [directoryQuery.data]);

  const save = useMutation({
    mutationFn: () => {
      if (!staff) throw new Error("No staff member selected.");
      return setStaffDirectory({
        data: {
          userId: staff.id,
          skillIds: [...skillIds],
          locationIds: [...locationIds],
        },
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-staff-directory"] }),
        queryClient.invalidateQueries({ queryKey: ["manager-shift-staff"] }),
        queryClient.invalidateQueries({ queryKey: ["staff-schedule"] }),
      ]);
      toast.success("Skills and certifications updated.");
      onClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update this person.");
    },
  });

  function toggle(setter: typeof setSkillIds, id: string, next: boolean) {
    setter((current) => {
      const nextSet = new Set(current);
      if (next) nextSet.add(id);
      else nextSet.delete(id);
      return nextSet;
    });
  }

  return (
    <Sheet open={Boolean(staff)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{staff ? staff.name : "Staff"}</SheetTitle>
          <SheetDescription>
            Skills and location certifications decide where this person can be assigned. Removing a
            cert does not rewrite past shifts.
          </SheetDescription>
        </SheetHeader>
        {staff ? (
          <form
            className="flex flex-col gap-6 px-4 pb-8"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            {directoryQuery.isPending || locationsQuery.isPending || skillsQuery.isPending ? (
              <p className="text-muted-foreground text-xs">Loading directory…</p>
            ) : (
              <>
                <section className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium">Skills</h3>
                  <AdminIdChecklist
                    items={(skillsQuery.data ?? []).map((skill) => ({
                      id: skill.id,
                      label: skill.name,
                    }))}
                    selected={skillIds}
                    onToggle={(id, next) => toggle(setSkillIds, id, next)}
                    emptyLabel="No skills in the catalog yet."
                  />
                </section>
                <section className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium">Certified locations</h3>
                  <AdminIdChecklist
                    items={(locationsQuery.data ?? []).map((location) => ({
                      id: location.id,
                      label: location.name,
                      hint: location.timezone,
                    }))}
                    selected={locationIds}
                    onToggle={(id, next) => toggle(setLocationIds, id, next)}
                    emptyLabel="Add a location first."
                  />
                </section>
              </>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-sm w-fit"
              disabled={save.isPending || directoryQuery.isPending}
              data-test="admin-save-staff-directory"
            >
              Save
            </button>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
