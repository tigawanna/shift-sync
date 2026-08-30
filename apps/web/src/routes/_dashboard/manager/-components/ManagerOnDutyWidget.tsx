import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { loadManagerHome } from "../-data-access-layer/manager-home.fn";

type Home = Awaited<ReturnType<typeof loadManagerHome>>;

export function ManagerOnDutyWidget({
  overseeingCount,
  onDutyTotal,
  items,
}: {
  overseeingCount: number;
  onDutyTotal: number;
  items: Home["onDuty"];
}) {
  return (
    <Card data-test="manager-on-duty-widget">
      <CardHeader className="border-b">
        <Link
          to="/manager/schedule"
          className="hover:bg-muted/40 -m-2 flex items-start justify-between gap-3 rounded-lg p-2 transition-colors"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CalendarDays className="text-muted-foreground size-4" />
              <CardTitle>Shifts</CardTitle>
            </div>
            <CardDescription>
              {overseeingCount} {overseeingCount === 1 ? "assignment" : "assignments"} still to
              oversee · {onDutyTotal} on duty now
            </CardDescription>
          </div>
          <span className="text-muted-foreground inline-flex items-center gap-1 text-sm whitespace-nowrap">
            Open schedule
            <ChevronRight className="size-4" aria-hidden />
          </span>
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nobody is on a shift right now.</p>
        ) : (
          <ul className="divide-border divide-y">
            {items.map((item) => (
              <li key={item.assignmentId}>
                <Link
                  to="/manager/team/$staffId"
                  params={{ staffId: item.userId }}
                  search={{ month: item.date.slice(0, 7) }}
                  className="hover:bg-muted/40 -mx-2 flex items-center gap-2 rounded-lg px-2 py-2.5"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                    <p className="text-sm">
                      {item.userName}{" "}
                      <span className="text-muted-foreground">· {item.skillName}</span>
                    </p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {item.locationName} · {item.startTime}–{item.endTime}
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {onDutyTotal > items.length ? (
          <p className="text-muted-foreground mt-2 text-xs">
            Showing {items.length} of {onDutyTotal} on duty. Open the schedule for every week.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
