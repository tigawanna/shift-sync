import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { formatDayLabel } from "@/lib/time/zoned";
import { cn } from "@/lib/utils";
import {
  dayAvailabilityLabel,
  dayHasOffMark,
  type DayAvailability,
} from "./staff-availability.day";
import { StaffScheduleDayHours } from "./StaffScheduleDayHours";

export function StaffScheduleDayCell({
  date,
  inMonth,
  isToday,
  dailyHours,
  availability,
  canEdit,
  onMarkAvailable,
  onRequestOff,
  onBlockHours,
}: {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  dailyHours: number;
  availability: DayAvailability | null;
  canEdit: boolean;
  onMarkAvailable: (date: string) => void;
  onRequestOff: (date: string) => void;
  onBlockHours: (date: string) => void;
}) {
  const off = availability ? dayHasOffMark(availability) : false;
  const label = availability ? dayAvailabilityLabel(availability) : null;

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div
            className={cn(
              "flex h-full flex-col px-2 pt-1.5 ring-1 ring-foreground/30 ring-inset",
              !inMonth && "bg-muted/50",
              inMonth && !off && "bg-card",
              inMonth &&
                availability?.weeklyClosed &&
                !availability.allDayBlocked &&
                !availability.hasPartialBlock &&
                "bg-muted/80",
              inMonth && availability?.hasPartialBlock && "bg-slate-500/12",
              inMonth && availability?.allDayBlocked && "bg-slate-500/20",
            )}
          />
        }
      >
        <div className="flex items-start justify-between gap-1">
          <button
            type="button"
            disabled={!canEdit}
            aria-label={`${formatDayLabel(date)}${isToday ? ", today" : ""}${off ? ", day off" : ""}. Mark available`}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-full text-sm tabular-nums",
              isToday ? "font-semibold" : "font-medium",
              !inMonth && "text-muted-foreground",
              canEdit && "hover:bg-foreground/10",
              isToday && "ring-2 ring-[#e08a52]",
              off && !isToday && "ring-2 ring-[#8b95a7]",
              off && isToday && "ring-2 ring-[#e08a52] outline outline-offset-2 outline-[#8b95a7]",
            )}
            onClick={() => onMarkAvailable(date)}
          >
            {date.slice(8)}
          </button>
          <StaffScheduleDayHours date={date} hours={dailyHours} />
        </div>
        {label ? (
          <p
            className={cn(
              "mt-1 line-clamp-2 text-[10px] leading-tight font-medium",
              availability?.allDayBlocked || availability?.hasPartialBlock
                ? "text-slate-200"
                : "text-muted-foreground",
            )}
          >
            {label}
          </p>
        ) : null}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem disabled={!canEdit} onClick={() => onRequestOff(date)}>
          Request off (all day)
        </ContextMenuItem>
        <ContextMenuItem disabled={!canEdit} onClick={() => onBlockHours(date)}>
          Block hours…
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={!canEdit} onClick={() => onMarkAvailable(date)}>
          I am available
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
