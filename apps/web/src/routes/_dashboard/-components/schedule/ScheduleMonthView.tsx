import {
  monthOverviewQueryOptions,
  overviewDayQueryOptions,
} from "@/data-access-layer/schedule/schedule.queries";
import { addMonthsYm, formatDayLabel, formatMonthLabel, monthGridDates } from "@/lib/time/zoned";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense, useState } from "react";
import { MonthCalendarGrid } from "./MonthCalendarGrid";
import { shiftTimeLabel } from "./shift-display";

type ScheduleMonthViewProps = {
  month: string;
  selectedDate?: string;
  onMonthChange: (month: string) => void;
  onSelectDate: (date: string) => void;
  personTo: "/admin/users/$userId" | "/manager/team/$userId";
};

export function ScheduleMonthView({
  month,
  selectedDate,
  onMonthChange,
  onSelectDate,
  personTo,
}: ScheduleMonthViewProps) {
  const overviewQuery = useSuspenseQuery(monthOverviewQueryOptions({ month }));
  const countByDate = new Map(overviewQuery.data.days.map((day) => [day.date, day.staffCount]));
  const dates = monthGridDates(month);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-center gap-2 sm:justify-end">
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square"
          aria-label="Previous month"
          onClick={() => onMonthChange(addMonthsYm(month, -1))}
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="min-w-40 text-center text-sm font-medium">{formatMonthLabel(month)}</p>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square"
          aria-label="Next month"
          onClick={() => onMonthChange(addMonthsYm(month, 1))}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <MonthCalendarGrid
        month={month}
        dates={dates}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        renderCell={(date, inMonth) => {
          const count = countByDate.get(date) ?? 0;
          if (count === 0) {
            return inMonth ? (
              <p className="text-base-content/35 text-[11px] leading-tight">Off</p>
            ) : null;
          }
          return (
            <p className="leading-tight">
              <span className="text-lg font-semibold tabular-nums sm:text-xl">{count}</span>
              <span className="text-base-content/55 mt-0.5 block text-[11px]">
                working
              </span>
            </p>
          );
        }}
      />

      {selectedDate ? (
        <Suspense fallback={<RouterPendingComponent />}>
          <OverviewDayPanel date={selectedDate} personTo={personTo} />
        </Suspense>
      ) : (
        <p className="text-base-content/55 text-sm">
          Select a day to see which restaurants are staffed, then open a location for the people on
          that shift.
        </p>
      )}
    </div>
  );
}

function OverviewDayPanel({
  date,
  personTo,
}: {
  date: string;
  personTo: "/admin/users/$userId" | "/manager/team/$userId";
}) {
  const dayQuery = useSuspenseQuery(overviewDayQueryOptions({ date }));
  const [openLocationId, setOpenLocationId] = useState<string | null>(null);
  const locations = dayQuery.data.locations;

  if (locations.length === 0) {
    return (
      <section className="border-base-content/10 rounded-2xl border px-5 py-8">
        <h2 className="text-lg font-semibold tracking-tight">{formatDayLabel(date)}</h2>
        <p className="text-base-content/60 mt-2 text-sm">Nobody is scheduled on this day.</p>
      </section>
    );
  }

  return (
    <section className="border-base-content/10 bg-base-100/70 flex flex-col gap-3 rounded-2xl border p-5">
      <h2 className="text-lg font-semibold tracking-tight">{formatDayLabel(date)}</h2>
      <ul className="flex flex-col gap-2">
        {locations.map((block) => {
          const open = openLocationId === block.location.id;
          const peopleCount = block.people.length;
          return (
            <li key={block.location.id} className="border-base-content/10 overflow-hidden rounded-xl border">
              <button
                type="button"
                className="hover:bg-base-200/60 flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                onClick={() => setOpenLocationId(open ? null : block.location.id)}
                aria-expanded={open}
              >
                <span>
                  <span className="font-medium">{block.location.name}</span>
                  <span className="text-base-content/55 mt-0.5 block text-xs">
                    {peopleCount} {peopleCount === 1 ? "person" : "people"}
                  </span>
                </span>
                <ChevronDown className={`text-base-content/50 size-4 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open ? (
                <ul className="border-base-content/10 flex flex-col gap-3 border-t px-4 py-3">
                  {block.people.map((person) => (
                    <li key={person.userId} className="flex flex-col gap-1">
                      <Link
                        to={personTo}
                        params={{ userId: person.userId }}
                        className="font-medium hover:underline"
                      >
                        {person.name}
                      </Link>
                      <p className="text-base-content/55 text-xs">{person.email}</p>
                      <ul className="mt-1 flex flex-col gap-1">
                        {person.shifts.map((shift) => (
                          <li key={shift.id} className="text-sm">
                            <span className="font-medium">{shift.skillName}</span>
                            <span className="text-base-content/60"> · {shiftTimeLabel(shift)}</span>
                            {shift.managers.length > 0 ? (
                              <span className="text-base-content/55 block text-xs">
                                Mgr: {shift.managers.join(", ")}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
