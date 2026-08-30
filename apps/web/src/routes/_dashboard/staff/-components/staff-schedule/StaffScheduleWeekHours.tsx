import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { WEEKLY_HOURS_LIMIT, WEEKLY_HOURS_RECOMMENDED } from "@/lib/schedule/constraints";
import { formatDayLabel } from "@/lib/time/zoned";
import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";

function weekIssues(hours: number, consecutiveDays: number) {
  const items: string[] = [];
  if (hours >= WEEKLY_HOURS_LIMIT) {
    items.push(`Over the ${WEEKLY_HOURS_LIMIT}h weekly limit.`);
  } else if (hours > WEEKLY_HOURS_RECOMMENDED) {
    items.push(`Over the ${WEEKLY_HOURS_RECOMMENDED}h recommended load.`);
  }
  if (consecutiveDays >= 7) {
    items.push("7th consecutive day this week — a manager override was required to assign.");
  } else if (consecutiveDays >= 6) {
    items.push("6th consecutive day this week.");
  }
  return items;
}

function weekHoursToneClass(severe: boolean, caution: boolean) {
  if (severe) return "bg-destructive/10 text-destructive";
  if (caution) return "bg-card text-warning";
  return "bg-card";
}

export function WeekHoursCell({
  hours,
  weekStart,
  consecutiveDays,
}: {
  hours: number;
  weekStart: string;
  consecutiveDays: number;
}) {
  const overLimit = hours >= WEEKLY_HOURS_LIMIT;
  const overRecommended = hours > WEEKLY_HOURS_RECOMMENDED;
  const seventhDay = consecutiveDays >= 7;
  const sixthDay = consecutiveDays >= 6;
  const issues = weekIssues(hours, consecutiveDays);
  const severe = overLimit || seventhDay;
  const caution = overRecommended || sixthDay;

  const hoursLabel = (
    <span className="tabular-nums">{hours === 0 ? "—" : `${hours.toFixed(1)}h`}</span>
  );

  if (issues.length === 0) {
    return (
      <div className="bg-card flex h-full flex-col items-center justify-center gap-0.5 px-1">
        <p className="text-muted-foreground text-[11px] font-medium">{hoursLabel}</p>
      </div>
    );
  }

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
              weekHoursToneClass(severe, caution),
            )}
            aria-label={`${hours.toFixed(1)} hours the week of ${weekStart}. ${issues.join(" ")}`}
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
        <ul className="mt-1 flex flex-col gap-1 text-sm">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-2 text-xs tabular-nums">
          {hours.toFixed(1)}h scheduled
          {consecutiveDays > 0
            ? ` · ${consecutiveDays} consecutive day${consecutiveDays === 1 ? "" : "s"}`
            : null}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
