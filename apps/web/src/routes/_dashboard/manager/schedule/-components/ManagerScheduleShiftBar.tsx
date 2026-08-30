import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { ManagerWeekSpan } from "./manager-schedule.spans";
import { shiftTimeLabel } from "./manager-schedule.spans";

export function ManagerScheduleShiftBar({
  span,
  side,
  editing,
  onSelect,
}: {
  span: ManagerWeekSpan;
  side: "top" | "bottom";
  editing: boolean;
  onSelect?: (shiftId: string) => void;
}) {
  const { shift } = span;
  const filled = `${shift.assignees.length}/${shift.headcountNeeded}`;

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            type="button"
            data-test="manager-schedule-shift"
            className="bg-primary text-primary-foreground hover:bg-primary/80 focus-visible:ring-ring flex h-6 w-full items-center truncate rounded-md px-2 text-left text-[11px] font-semibold focus-visible:ring-2 focus-visible:outline-none"
            onClick={() => {
              if (editing) onSelect?.(shift.id);
            }}
          />
        }
      >
        {shift.skillName} · {shiftTimeLabel(shift)} · {filled}
      </HoverCardTrigger>
      <HoverCardContent side={side} align="start" className="w-72 p-3">
        <p className="font-medium">{shift.skillName}</p>
        <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
          {shiftTimeLabel(shift)} · {shift.hours.toFixed(1)}h
        </p>
        <p className="mt-2 text-xs">
          {shift.assignees.length > 0
            ? shift.assignees.map((person) => person.name).join(", ")
            : "Unassigned"}
          {` · ${filled} filled`}
        </p>
        {shift.notes ? <p className="text-muted-foreground mt-2 text-xs">{shift.notes}</p> : null}
      </HoverCardContent>
    </HoverCard>
  );
}
