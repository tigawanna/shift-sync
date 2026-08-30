import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StaffScheduleQueryMeta } from "@/routes/_dashboard/staff/-data-access-layer/staff-schedule.fn";

export function QueryMetaPanel({
  meta,
  monthLabel,
  monthlyHours,
}: {
  meta: StaffScheduleQueryMeta;
  monthLabel: string;
  monthlyHours: number;
}) {
  return (
    <Card size="sm" data-test="staff-schedule-meta">
      <CardHeader className="border-b">
        <CardTitle className="text-base">Query pipeline</CardTitle>
        <CardDescription>
          Two Drizzle reads, then JS maps timezones, filters published weeks, and groups by day.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
        <dl className="space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Certified locations</dt>
            <dd className="font-mono">{meta.locationCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Published weeks loaded</dt>
            <dd className="font-mono">{meta.publishedWeekCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">UTC query window</dt>
            <dd className="font-mono text-xs">{meta.utcQueryStart.slice(0, 16)} → …</dd>
          </div>
        </dl>
        <dl className="space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Rows from SQL</dt>
            <dd className="font-mono">{meta.dbRowCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">After published filter</dt>
            <dd className="font-mono">{meta.publishedShiftCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">In {monthLabel}</dt>
            <dd className="font-mono">
              {meta.monthShiftCount} shifts · {monthlyHours.toFixed(1)}h
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
