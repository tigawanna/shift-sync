import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { CalendarSpan } from "./staff-schedule.spans";
import { shiftTimeLabel } from "./staff-schedule.spans";

export function ShiftSpanHover({ span, side }: { span: CalendarSpan; side: "top" | "bottom" }) {
  const lead = span.shifts[0];
  if (!lead) return null;

  const hours = span.shifts.reduce((total, shift) => total + shift.hours, 0);

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            type="button"
            className="flex h-5 w-full items-center truncate rounded-md bg-[#9c4524] px-2 text-left text-[11px] font-semibold text-[#fff7f0] hover:bg-[#863b1f] focus-visible:ring-2 focus-visible:ring-[#e08a52] focus-visible:outline-none"
          />
        }
      >
        {lead.locationName}
      </HoverCardTrigger>
      <HoverCardContent side={side} align="start" className="w-72 p-3">
        <p className="font-medium">{lead.locationName}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {lead.skillName} · {hours.toFixed(1)}h
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
                </p>
              </li>
            );
          })}
        </ul>
        <p className="text-muted-foreground mt-2 text-[11px]">{lead.timezone}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
