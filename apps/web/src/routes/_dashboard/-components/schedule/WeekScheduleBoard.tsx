import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { WeekDayColumn, WeekShift } from "@/data-access-layer/schedule/schedule.types";
import { formatWeekdayYmd } from "@/lib/time/zoned";
import { coverageLabel, shiftTimeLabel, skillAccentClass } from "./shift-display";

type WeekScheduleBoardProps = {
  days: WeekDayColumn[];
  onSelectShift?: (shift: WeekShift) => void;
  onAddDay?: (ymd: string) => void;
  showLocation?: boolean;
  showManagers?: boolean;
};

export function WeekScheduleBoard({
  days,
  onSelectShift,
  onAddDay,
  showLocation = false,
  showManagers = false,
}: WeekScheduleBoardProps) {
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((day) => {
        return (
          <section
            key={day.date}
            className="border-base-content/10 bg-base-100/60 flex min-h-56 flex-col gap-2 rounded-2xl border p-3"
          >
            <header className="flex items-baseline justify-between gap-2">
              <div>
                <p className="text-xs font-medium tracking-wide uppercase">
                  {formatWeekdayYmd(day.date)}
                </p>
                <p className="text-base-content/60 text-xs tabular-nums">{day.date.slice(5)}</p>
              </div>
              {onAddDay ? (
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => onAddDay(day.date)}>
                  Add
                </button>
              ) : null}
            </header>

            {day.shifts.length === 0 ? (
              <p className="text-base-content/40 py-6 text-center text-xs">No shifts</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {day.shifts.map((shift) => {
                  const understaffed = shift.assignedCount < shift.headcountNeeded;
                  const body = (
                    <>
                      <p className="text-xs font-semibold">{shift.skillName}</p>
                      <p className="text-[11px] tabular-nums opacity-80">{shiftTimeLabel(shift)}</p>
                      {showLocation ? (
                        <p className="text-[11px] opacity-70">{shift.locationName}</p>
                      ) : null}
                      {showManagers && shift.managers.length > 0 ? (
                        <p className="text-[11px] opacity-70">Mgr: {shift.managers.join(", ")}</p>
                      ) : null}
                      <p
                        className={`mt-1 text-[11px] font-medium ${understaffed ? "text-error" : "opacity-80"}`}
                      >
                        {coverageLabel(shift)}
                        {shift.assignees.length > 0 ? ` · ${shift.assignees.map((person) => person.name).join(", ")}` : ""}
                        {shift.locked ? " · locked" : ""}
                      </p>
                    </>
                  );

                  return (
                    <li key={shift.id}>
                      {onSelectShift ? (
                        <button
                          type="button"
                          onClick={() => onSelectShift(shift)}
                          className={`w-full rounded-xl border px-2.5 py-2 text-left ${skillAccentClass(shift.skillId)}`}
                        >
                          {body}
                        </button>
                      ) : (
                        <div className={`rounded-xl border px-2.5 py-2 ${skillAccentClass(shift.skillId)}`}>
                          {body}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function EmptyScheduleLocations() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No locations to schedule</EmptyTitle>
        <EmptyDescription>
          Assign this manager to a restaurant first, then the week board will appear here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
