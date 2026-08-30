import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { StaffScheduleShift } from "@/routes/_dashboard/staff/-data-access-layer/staff-schedule.fn";
import { cn } from "@/lib/utils";
import type { CalendarSpan } from "./staff-schedule.spans";
import { shiftTimeLabel } from "./staff-schedule.spans";

export function ShiftSpanHover({
  span,
  side,
  pendingShiftIds,
  onSwap,
  onDrop,
  onAskManager,
}: {
  span: CalendarSpan;
  side: "top" | "bottom";
  pendingShiftIds: Set<string>;
  onSwap?: (shifts: StaffScheduleShift[]) => void;
  onDrop?: (shifts: StaffScheduleShift[]) => void;
  onAskManager?: (shifts: StaffScheduleShift[]) => void;
}) {
  const lead = span.shifts[0];
  if (!lead) return null;

  const hours = span.shifts.reduce((total, shift) => total + shift.hours, 0);
  const actionable = span.shifts.filter((shift) => !pendingShiftIds.has(shift.id));
  const pending = !onAskManager && actionable.length === 0;
  const draft = span.shifts.some((shift) => !shift.published);

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block h-5 w-full">
        <HoverCard>
          <HoverCardTrigger
            render={
              <button
                type="button"
                className={cn(
                  "flex h-5 w-full items-center truncate rounded-md px-2 text-left text-[11px] font-semibold text-[#fff7f0] focus-visible:ring-2 focus-visible:ring-[#e08a52] focus-visible:outline-none",
                  draft
                    ? "bg-[#9c4524]/55 ring-1 ring-dashed ring-[#e08a52] hover:bg-[#9c4524]/70"
                    : "bg-[#9c4524] hover:bg-[#863b1f]",
                )}
                onClick={() => {
                  if (onAskManager) {
                    onAskManager(span.shifts);
                    return;
                  }
                  if (!pending) onSwap?.(span.shifts);
                }}
              />
            }
          >
            {lead.locationName}
          </HoverCardTrigger>
          <HoverCardContent side={side} align="start" className="w-72 p-3">
            <p className="font-medium">{lead.locationName}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {lead.skillName} · {hours.toFixed(1)}h{draft ? " · unpublished" : ""}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {span.shifts.map((shift) => {
                const sameDay = shift.startDate === shift.endDate;
                const dayLabel = sameDay
                  ? shift.startDate.slice(5)
                  : `${shift.startDate.slice(5)}–${shift.endDate.slice(5)}`;

                return (
                  <li key={shift.id} className="text-xs">
                    <p className="tabular-nums">{dayLabel}</p>
                    <p className="text-muted-foreground tabular-nums">
                      {shiftTimeLabel(shift)}
                      {shift.notes ? ` · ${shift.notes}` : ""}
                      {pendingShiftIds.has(shift.id) ? " · pending" : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
            <p className="text-muted-foreground mt-2 text-[11px]">{lead.timezone}</p>
            <p className="text-muted-foreground mt-2 text-[11px]">
              {onAskManager
                ? "Click to ask a manager to change this assignment."
                : "Click to swap. Right-click to swap or drop."}
            </p>
          </HoverCardContent>
        </HoverCard>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {onAskManager ? (
          <ContextMenuItem onClick={() => onAskManager(span.shifts)}>
            Ask manager to change…
          </ContextMenuItem>
        ) : (
          <>
            <ContextMenuItem disabled={pending} onClick={() => onSwap?.(span.shifts)}>
              Swap with someone…
            </ContextMenuItem>
            <ContextMenuItem disabled={pending} onClick={() => onDrop?.(span.shifts)}>
              Drop this run…
            </ContextMenuItem>
            {pending ? (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem disabled>Pending coverage request</ContextMenuItem>
              </>
            ) : null}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
