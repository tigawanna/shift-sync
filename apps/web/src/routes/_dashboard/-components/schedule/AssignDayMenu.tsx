import { assignStaffToCalendarShift } from "@/data-access-layer/schedule/schedule.functions";
import { dayAssignableShiftsQueryOptions } from "@/data-access-layer/schedule/schedule.queries";
import { teamMemberQueryOptions } from "@/data-access-layer/team/team.queries";
import type { WeekShift } from "@/data-access-layer/schedule/schedule.types";
import { formatDayLabel } from "@/lib/time/zoned";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { shiftTimeLabel } from "./shift-display";

export type AssignMenuState = {
  date: string;
  x: number;
  y: number;
};

type AssignDayMenuProps = {
  userId: string;
  month: string;
  menu: AssignMenuState;
  onClose: () => void;
};

export function AssignDayMenu({ userId, month, menu, onClose }: AssignDayMenuProps) {
  const qc = useQueryClient();
  const shiftsQuery = useQuery(dayAssignableShiftsQueryOptions({ date: menu.date, userId }));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-assign-day-menu]")) return;
      onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [onClose]);

  const assignMutation = useMutation({
    mutationFn: async (shiftId: string) =>
      assignStaffToCalendarShift({ data: { shiftId, userId } }),
    onSuccess: async (result, shiftId) => {
      if (!result.ok) {
        toast.error(result.failures.map((failure) => failure.message).join(" "));
        return;
      }
      const shift = shiftsQuery.data?.find((row) => row.id === shiftId);
      toast.success(
        shift
          ? `Assigned to ${shift.locationName} (${shift.skillName}).`
          : "Assigned to that shift.",
      );
      if (result.warnings.length > 0) {
        toast.warning(result.warnings.map((warning) => warning.message).join(" "));
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["schedule", "user", userId, month] }),
        qc.invalidateQueries(teamMemberQueryOptions({ userId })),
        qc.invalidateQueries({ queryKey: ["schedule", "day-assign", userId, menu.date] }),
      ]);
      onClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not assign this shift.");
    },
  });

  const shifts = shiftsQuery.data ?? [];
  const grouped = groupByLocation(shifts);

  return (
    <div
      data-assign-day-menu
      className="border-base-content/15 bg-base-100 fixed z-50 max-h-80 w-72 overflow-y-auto rounded-xl border p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
      style={{
        left: Math.min(menu.x, window.innerWidth - 300),
        top: Math.min(menu.y, window.innerHeight - 80),
      }}
    >
      <p className="text-base-content/60 px-2 py-1.5 text-[11px] font-medium tracking-wide uppercase">
        Assign · {formatDayLabel(menu.date)}
      </p>
      {shiftsQuery.isPending ? (
        <p className="text-base-content/60 px-2 py-2 text-sm">Loading shifts…</p>
      ) : null}
      {shiftsQuery.isError ? (
        <p className="text-error px-2 py-2 text-sm">
          {shiftsQuery.error instanceof Error
            ? shiftsQuery.error.message
            : "Could not load shifts for this day."}
        </p>
      ) : null}
      {!shiftsQuery.isPending && !shiftsQuery.isError && shifts.length === 0 ? (
        <p className="text-base-content/60 px-2 py-2 text-sm">No location shifts on this day.</p>
      ) : null}
      {grouped.map((group) => (
        <div key={group.locationId} className="mt-1">
          <p className="text-base-content/50 px-2 py-1 text-[11px] font-medium">
            {group.locationName}
          </p>
          {group.shifts.map((shift) => {
            const alreadyOn = shift.assignees.some((assignee) => assignee.userId === userId);
            const disabled = alreadyOn || shift.locked || assignMutation.isPending;
            return (
              <button
                key={shift.id}
                type="button"
                disabled={disabled}
                className="hover:bg-base-200 disabled:text-base-content/40 w-full rounded-lg px-2 py-1.5 text-left text-sm disabled:cursor-not-allowed"
                onClick={() => assignMutation.mutate(shift.id)}
              >
                <span className="font-medium">{shift.skillName}</span>
                <span className="text-base-content/60 ml-1.5 tabular-nums">
                  {shiftTimeLabel(shift)}
                </span>
                {alreadyOn ? (
                  <span className="text-base-content/45 ml-1.5 text-xs">already on</span>
                ) : null}
                {shift.locked && !alreadyOn ? (
                  <span className="text-base-content/45 ml-1.5 text-xs">locked</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function groupByLocation(shifts: WeekShift[]) {
  const groups: Array<{ locationId: string; locationName: string; shifts: WeekShift[] }> = [];
  for (const shift of shifts) {
    const existing = groups.find((group) => group.locationId === shift.locationId);
    if (existing) {
      existing.shifts.push(shift);
      continue;
    }
    groups.push({
      locationId: shift.locationId,
      locationName: shift.locationName,
      shifts: [shift],
    });
  }
  return groups;
}
