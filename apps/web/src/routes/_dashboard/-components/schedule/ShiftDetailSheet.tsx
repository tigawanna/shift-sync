import { SearchBox } from "@/components/search/SearchBox";
import { ConfirmAction } from "@/components/ui/confirm-action";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  assignStaffToShift,
  deleteShift,
  unassignStaffFromShift,
} from "@/data-access-layer/schedule/schedule.functions";
import { staffForShiftQueryOptions } from "@/data-access-layer/schedule/schedule.queries";
import type { WeekShift } from "@/data-access-layer/schedule/schedule.types";
import { formatTimezone } from "@/utils/date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { coverageLabel, shiftTimeLabel } from "./shift-display";

type ShiftDetailSheetProps = {
  shift: WeekShift | null;
  onClose: () => void;
};

export function ShiftDetailSheet({ shift, onClose }: ShiftDetailSheetProps) {
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState("");

  const staffQuery = useQuery({
    ...staffForShiftQueryOptions({ shiftId: shift?.id ?? "" }),
    enabled: Boolean(shift),
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!shift) throw new Error("No shift selected.");
      return assignStaffToShift({ data: { shiftId: shift.id, userId } });
    },
    onSuccess: (result) => {
      if (!result.ok) {
        const detail = result.failures.map((failure) => failure.message).join(" ");
        const suggestion =
          result.suggestions.length > 0
            ? ` Try ${result.suggestions.map((person) => person.name).join(", ")}.`
            : "";
        toast.error(`${detail}${suggestion}`);
        return;
      }
      if (result.warnings.length > 0) {
        toast.warning(result.warnings.map((warning) => warning.message).join(" "));
      } else {
        toast.success("Staff assigned.");
      }
      void qc.invalidateQueries({ queryKey: ["schedule"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not assign staff.");
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!shift) throw new Error("No shift selected.");
      return unassignStaffFromShift({ data: { shiftId: shift.id, userId } });
    },
    onSuccess: () => {
      toast.success("Assignment removed.");
      void qc.invalidateQueries({ queryKey: ["schedule"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not remove assignment.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!shift) throw new Error("No shift selected.");
      return deleteShift({ data: { shiftId: shift.id } });
    },
    onSuccess: () => {
      toast.success("Shift deleted.");
      void qc.invalidateQueries({ queryKey: ["schedule"] });
      onClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete shift.");
    },
  });

  const filteredStaff = useMemo(() => {
    const rows = staffQuery.data ?? [];
    const needle = keyword.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (person) =>
        person.name.toLowerCase().includes(needle) || person.email.toLowerCase().includes(needle),
    );
  }, [keyword, staffQuery.data]);

  return (
    <Sheet open={Boolean(shift)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {shift ? (
          <>
            <SheetHeader>
              <SheetTitle>{shift.skillName}</SheetTitle>
              <SheetDescription>
                {shiftTimeLabel(shift)} · {shift.locationName} · {formatTimezone(shift.timezone)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-4 pb-8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm">
                  Coverage{" "}
                  <span className="font-medium tabular-nums">{coverageLabel(shift)}</span>
                </p>
                {shift.locked ? (
                  <span className="badge badge-ghost badge-sm">Locked (48h cutoff)</span>
                ) : (
                  <ConfirmAction
                    title="Delete this shift?"
                    description="Assignments on this shift will be removed."
                    confirmLabel="Delete shift"
                    onConfirm={() => deleteMutation.mutate()}
                  >
                    <button type="button" className="btn btn-ghost btn-xs text-error">
                      Delete
                    </button>
                  </ConfirmAction>
                )}
              </div>

              {shift.notes ? (
                <p className="text-base-content/70 text-sm">{shift.notes}</p>
              ) : null}

              {shift.assignees.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium">Assigned</h3>
                  <ul className="flex flex-col gap-1">
                    {shift.assignees.map((assignee) => (
                      <li
                        key={assignee.userId}
                        className="flex items-center justify-between gap-2 rounded-lg border border-base-content/10 px-3 py-2 text-sm"
                      >
                        <span>{assignee.name}</span>
                        {shift.locked ? null : (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            disabled={unassignMutation.isPending}
                            onClick={() => unassignMutation.mutate(assignee.userId)}
                          >
                            Remove
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-medium">Staff at this location</h3>
                <SearchBox
                  keyword={keyword}
                  setKeyword={setKeyword}
                  placeholder="Search staff…"
                  data-test="shift-staff-search"
                />
                {staffQuery.isLoading ? (
                  <p className="text-base-content/60 text-sm">Loading staff…</p>
                ) : (
                  <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto">
                    {filteredStaff.map((person) => (
                      <li
                        key={person.userId}
                        className="border-base-content/10 flex flex-col gap-2 rounded-xl border p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{person.name}</p>
                            <p className="text-base-content/55 text-xs">{person.email}</p>
                          </div>
                          {person.eligible && !shift.locked ? (
                            <button
                              type="button"
                              className="btn btn-primary btn-xs"
                              disabled={assignMutation.isPending}
                              onClick={() => assignMutation.mutate(person.userId)}
                            >
                              Assign
                            </button>
                          ) : null}
                        </div>
                        {person.failures.length > 0 ? (
                          <ul className="flex flex-col gap-1">
                            {person.failures.map((failure) => (
                              <li key={failure.rule} className="text-error text-xs">
                                {failure.message}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {person.warnings.map((warning) => (
                          <p key={warning.rule} className="text-warning text-xs">
                            {warning.message}
                          </p>
                        ))}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
