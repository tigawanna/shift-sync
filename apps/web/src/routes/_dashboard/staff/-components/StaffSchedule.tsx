import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import type {
  StaffScheduleQueryMeta,
  StaffScheduleShift,
} from "@/routes/_dashboard/staff/-data-access-layer/staff-schedule.fn";
import { addMonthsYm, currentYearMonth } from "@/lib/time/zoned";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { myStaffScheduleQueryOptions } from "../-data-access-layer/staff-schedule.query-options";
import { Route } from "../index";

function shiftTimeLabel(shift: StaffScheduleShift) {
  if (shift.overnight) {
    return `${shift.startTime}–${shift.endTime} (+1)`;
  }
  return `${shift.startTime}–${shift.endTime}`;
}

function QueryMetaPanel({
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

export function StaffSchedule() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const month = search.month ?? currentYearMonth("UTC");
  const scheduleQuery = useSuspenseQuery(myStaffScheduleQueryOptions({ month }));
  const schedule = scheduleQuery.data;

  const goToMonth = (nextMonth: string) => {
    void navigate({ search: { month: nextMonth } });
  };

  return (
    <div className="flex flex-col gap-6" data-test="staff-schedule">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Previous month"
            onClick={() => goToMonth(addMonthsYm(month, -1))}
          >
            <ChevronLeft className="size-4" />
          </button>
          <h2 className="min-w-40 text-center text-lg font-semibold">{schedule.monthLabel}</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Next month"
            onClick={() => goToMonth(addMonthsYm(month, 1))}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <p className="text-muted-foreground text-sm">
          {schedule.meta.monthShiftCount} published shifts · {schedule.monthlyHours.toFixed(1)} hours
        </p>
      </div>

      <QueryMetaPanel
        meta={schedule.meta}
        monthLabel={schedule.monthLabel}
        monthlyHours={schedule.monthlyHours}
      />

      {schedule.days.length === 0 ? (
        <Empty className="min-h-[40dvh] rounded-xl border">
          <EmptyHeader>
            <EmptyTitle>No published shifts</EmptyTitle>
            <EmptyDescription>
              When a manager publishes a week you are assigned to, those shifts will show up here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {schedule.days.map((day) => (
            <section key={day.date} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{day.label}</h3>
              <div className="flex flex-col gap-2">
                {day.shifts.map((shift) => (
                  <Card key={shift.id} size="sm">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-(--card-spacing)">
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="font-medium">{shift.locationName}</p>
                        <p className="text-muted-foreground text-sm">
                          {shiftTimeLabel(shift)} · {shift.timezone}
                        </p>
                        {shift.notes ? (
                          <p className="text-muted-foreground text-sm">{shift.notes}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{shift.skillName}</Badge>
                        <Badge variant="outline">{shift.hours.toFixed(1)}h</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
