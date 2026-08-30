import { ConfirmAction } from "@/components/ui/confirm-action";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ManagerWeekShift } from "../../-data-access-layer/manager-schedule.fn";
import {
  assignManagerShift,
  createManagerShift,
  deleteManagerShift,
  unassignManagerShift,
  updateManagerShift,
} from "../../-data-access-layer/manager-shifts.fn";
import {
  managerSkillsQueryOptions,
  staffForManagerShiftQueryOptions,
} from "../../-data-access-layer/manager-schedule.query-options";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type CreateDraft = {
  kind: "create";
  locationId: string;
  startDate: string;
};

type EditDraft = {
  kind: "edit";
  locationId: string;
  shift: ManagerWeekShift;
  published: boolean;
};

export type ManagerShiftPanel = CreateDraft | EditDraft;

export function ManagerShiftSheet({
  panel,
  onClose,
}: {
  panel: ManagerShiftPanel | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const skillsQuery = useQuery(managerSkillsQueryOptions());
  const skills = skillsQuery.data ?? [];
  const shiftId = panel?.kind === "edit" ? panel.shift.id : "";
  const staffQuery = useQuery({
    ...staffForManagerShiftQueryOptions(shiftId),
    enabled: Boolean(shiftId),
  });

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("22:00");
  const [skillId, setSkillId] = useState("");
  const [headcountNeeded, setHeadcountNeeded] = useState(2);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!panel) return;
    if (panel.kind === "create") {
      setStartDate(panel.startDate);
      setStartTime("16:00");
      setEndTime("22:00");
      setSkillId(skills[0]?.id ?? "");
      setHeadcountNeeded(2);
      setNotes("");
      return;
    }
    setStartDate(panel.shift.startDate);
    setStartTime(panel.shift.startTime);
    setEndTime(panel.shift.endTime);
    setSkillId(panel.shift.skillId);
    setHeadcountNeeded(panel.shift.headcountNeeded);
    setNotes(panel.shift.notes ?? "");
  }, [panel, skills]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["manager-schedule"] }),
      queryClient.invalidateQueries({ queryKey: ["manager-schedules"] }),
      queryClient.invalidateQueries({ queryKey: ["manager-shift-staff"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-schedule"] }),
    ]);
  };

  const canMutate =
    panel?.kind === "create" ||
    (panel?.kind === "edit" && !(panel.published && panel.shift.locked));

  const save = useMutation({
    mutationFn: async () => {
      if (!panel) throw new Error("Nothing to save.");
      const payload = {
        skillId,
        startDate,
        startTime,
        endTime,
        headcountNeeded,
        notes: notes.trim() || undefined,
      };
      if (panel.kind === "create") {
        return createManagerShift({ data: { locationId: panel.locationId, ...payload } });
      }
      return updateManagerShift({ data: { shiftId: panel.shift.id, ...payload } });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success(panel?.kind === "create" ? "Shift created." : "Shift updated.");
      onClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save this shift.");
    },
  });

  const remove = useMutation({
    mutationFn: () => {
      if (panel?.kind !== "edit") throw new Error("No shift selected.");
      return deleteManagerShift({ data: { shiftId: panel.shift.id } });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Shift deleted.");
      onClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete this shift.");
    },
  });

  const assign = useMutation({
    mutationFn: (userId: string) => {
      if (panel?.kind !== "edit") throw new Error("No shift selected.");
      return assignManagerShift({ data: { shiftId: panel.shift.id, userId } });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Staff assigned.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not assign staff.");
    },
  });

  const unassign = useMutation({
    mutationFn: (userId: string) => {
      if (panel?.kind !== "edit") throw new Error("No shift selected.");
      return unassignManagerShift({ data: { shiftId: panel.shift.id, userId } });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Assignment removed.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not remove assignment.");
    },
  });

  return (
    <Sheet open={Boolean(panel)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{panel?.kind === "edit" ? "Edit shift" : "Add shift"}</SheetTitle>
          <SheetDescription>
            Times use this location timezone. End before start means overnight.
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
            {!canMutate ? (
              <p className="text-muted-foreground text-xs">
                This published shift is inside the 48-hour cutoff, so it cannot be changed.
              </p>
            ) : null}

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground text-xs">Date</span>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                disabled={!canMutate}
                required
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground text-xs">Starts</span>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  disabled={!canMutate}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground text-xs">Ends</span>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  disabled={!canMutate}
                  required
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground text-xs">Required skill</span>
              <select
                className="select-bordered select select-sm"
                value={skillId}
                onChange={(event) => setSkillId(event.target.value)}
                disabled={!canMutate}
                required
              >
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground text-xs">Headcount</span>
              <Input
                type="number"
                min={1}
                max={20}
                value={headcountNeeded}
                onChange={(event) => setHeadcountNeeded(Number(event.target.value))}
                disabled={!canMutate}
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground text-xs">Notes</span>
              <Input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={!canMutate}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!canMutate || save.isPending || !skillId}
                data-test="manager-save-shift"
              >
                {panel.kind === "create" ? "Create shift" : "Save changes"}
              </button>
              {panel.kind === "edit" ? (
                <ConfirmAction
                  title="Delete this shift?"
                  description="Assignments on this shift will be removed."
                  confirmLabel="Delete shift"
                  disabled={!canMutate || remove.isPending}
                  onConfirm={() => remove.mutate()}
                >
                  <button
                    type="button"
                    className="btn btn-outline btn-sm text-destructive"
                    disabled={!canMutate || remove.isPending}
                    data-test="manager-delete-shift"
                  >
                    Delete shift
                  </button>
                </ConfirmAction>
              ) : null}
            </div>

            {panel.kind === "edit" ? (
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Assign staff</h3>
                <p className="text-muted-foreground text-xs">
                  Staff must have this skill and be certified at this location.
                </p>
                {staffQuery.isPending ? (
                  <p className="text-muted-foreground text-xs">Loading people…</p>
                ) : null}
                <ul className="flex flex-col gap-1">
                  {(staffQuery.data ?? []).map((person) => (
                    <li
                      key={person.id}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm">{person.name}</p>
                        <p className="text-muted-foreground text-xs">{person.email}</p>
                      </div>
                      {person.assigned ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          disabled={!canMutate || unassign.isPending}
                          onClick={() => unassign.mutate(person.id)}
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          disabled={!canMutate || assign.isPending}
                          onClick={() => assign.mutate(person.id)}
                        >
                          Assign
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
