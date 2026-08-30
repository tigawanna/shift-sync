import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { ManagerWeekSpan } from "./manager-schedule.spans";
import { shiftTimeLabel } from "./manager-schedule.spans";

export function ManagerScheduleShiftBar({
  span,
  side,
}: {
  span: ManagerWeekSpan;
  side: "top" | "bottom";
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
            className="flex h-6 w-full items-center truncate rounded-md bg-[#9c4524] px-2 text-left text-[11px] font-semibold text-[#fff7f0] hover:bg-[#863b1f] focus-visible:ring-2 focus-visible:ring-[#e08a52] focus-visible:outline-none"
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
