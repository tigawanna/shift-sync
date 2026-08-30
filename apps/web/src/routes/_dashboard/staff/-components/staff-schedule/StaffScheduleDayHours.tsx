import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { DAILY_HOURS_BLOCK, DAILY_HOURS_WARN } from "@/lib/schedule/assign-constraints";
import { formatDayLabel } from "@/lib/time/zoned";
import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";

function dailyHoursTone(hours: number) {
  if (hours > DAILY_HOURS_BLOCK) return "block" as const;
  if (hours > DAILY_HOURS_WARN) return "warn" as const;
  return "ok" as const;
}

export function StaffScheduleDayHours({ date, hours }: { date: string; hours: number }) {
  const tone = dailyHoursTone(hours);
  if (tone === "ok") return null;

  const overBlock = tone === "block";
  const reason = overBlock
    ? `Over the ${DAILY_HOURS_BLOCK}h daily hard limit.`
    : `Over the ${DAILY_HOURS_WARN}h daily warning.`;

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={0}
        closeDelay={100}
        render={
          <button
            type="button"
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-full",
              overBlock ? "text-destructive" : "text-warning",
            )}
            aria-label={`${hours.toFixed(1)} hours on ${formatDayLabel(date)}. ${reason}`}
          />
        }
      >
        <TriangleAlert className="size-3.5" />
      </HoverCardTrigger>
      <HoverCardContent side="top" align="end" className="w-64 p-3">
        <p className="font-medium">{formatDayLabel(date)}</p>
        <p className="mt-1 text-sm">{reason}</p>
        <p className="text-muted-foreground mt-2 text-xs tabular-nums">
          {hours.toFixed(1)}h scheduled
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
