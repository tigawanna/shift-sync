import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { WEEKLY_HOURS_LIMIT, WEEKLY_HOURS_RECOMMENDED } from "@/lib/schedule/constraints";
import { formatDayLabel } from "@/lib/time/zoned";
import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";

export function WeekHoursCell({ hours, weekStart }: { hours: number; weekStart: string }) {
  const overLimit = hours >= WEEKLY_HOURS_LIMIT;
  const overRecommended = hours > WEEKLY_HOURS_RECOMMENDED;
  const hoursOverRecommended = hours - WEEKLY_HOURS_RECOMMENDED;
  const hoursOverLimit = hours - WEEKLY_HOURS_LIMIT;

  const hoursLabel = (
    <span className="tabular-nums">{hours === 0 ? "—" : `${hours.toFixed(1)}h`}</span>
  );

  if (!overRecommended) {
    return (
      <div className="bg-card flex h-full flex-col items-center justify-center gap-0.5 px-1">
        <p className="text-muted-foreground text-[11px] font-medium">{hoursLabel}</p>
      </div>
    );
  }

  const reason = overLimit
    ? `This week is over the ${WEEKLY_HOURS_LIMIT}h weekly limit.`
    : `This week is over the ${WEEKLY_HOURS_RECOMMENDED}h recommended load.`;

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={0}
        closeDelay={100}
        render={
          <button
            type="button"
            className={cn(
              "flex h-full w-full flex-col items-center justify-center gap-0.5 px-1",
              overLimit ? "bg-destructive/10 text-destructive" : "bg-card text-amber-600 dark:text-amber-400",
            )}
            aria-label={`${hours.toFixed(1)} hours the week of ${weekStart}, over the weekly limit`}
          />
        }
      >
        <span className="flex items-center gap-0.5 text-[11px] font-semibold">
          <TriangleAlert className="size-3 shrink-0" />
          {hoursLabel}
        </span>
      </HoverCardTrigger>
      <HoverCardContent side="left" align="center" className="w-64 p-3">
        <p className="font-medium">Week of {formatDayLabel(weekStart)}</p>
        <p className="mt-1 text-sm">{reason}</p>
        <p className="text-muted-foreground mt-2 text-xs tabular-nums">
          {hours.toFixed(1)}h scheduled
          {overLimit ? ` · ${hoursOverLimit.toFixed(1)}h over the ${WEEKLY_HOURS_LIMIT}h limit` : null}
          {` · ${hoursOverRecommended.toFixed(1)}h over the ${WEEKLY_HOURS_RECOMMENDED}h recommended`}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
