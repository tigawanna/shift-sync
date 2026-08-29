import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { WeekSchedule, WeekShift } from "@/data-access-layer/schedule/schedule.types";
import { addDaysYmd, formatWeekdayYmd } from "@/lib/time/zoned";
import { coverageLabel, shiftTimeLabel, skillAccentClass } from "./shift-display";

type WeekScheduleBoardProps = {
  schedule: WeekSchedule;
  onSelectShift: (shift: WeekShift) => void;
  onAddDay: (ymd: string) => void;
};

export function WeekScheduleBoard({ schedule, onSelectShift, onAddDay }: WeekScheduleBoardProps) {
  const days = Array.from({ length: 7 }, (_, index) => addDaysYmd(schedule.weekStart, index));

  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((ymd) => {
        const dayShifts = schedule.shifts
          .filter((shift) => shift.startDate === ymd)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        return (
          <section
            key={ymd}
            className="border-base-content/10 bg-base-100/60 flex min-h-56 flex-col gap-2 rounded-2xl border p-3"
          >
            <header className="flex items-baseline justify-between gap-2">
              <div>
                <p className="text-xs font-medium tracking-wide uppercase">{formatWeekdayYmd(ymd)}</p>
                <p className="text-base-content/60 text-xs tabular-nums">{ymd.slice(5)}</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => onAddDay(ymd)}
              >
                Add
              </button>
            </header>

            {dayShifts.length === 0 ? (
              <p className="text-base-content/40 py-6 text-center text-xs">No shifts</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {dayShifts.map((shift) => {
                  const understaffed = shift.assignedCount < shift.headcountNeeded;
                  return (
                    <li key={shift.id}>
                      <button
                        type="button"
                        onClick={() => onSelectShift(shift)}
                        className={`w-full rounded-xl border px-2.5 py-2 text-left ${skillAccentClass(shift.skillId)}`}
                      >
                        <p className="text-xs font-semibold">{shift.skillName}</p>
                        <p className="text-[11px] tabular-nums opacity-80">{shiftTimeLabel(shift)}</p>
                        <p
                          className={`mt-1 text-[11px] font-medium ${understaffed ? "text-error" : "opacity-80"}`}
                        >
                          {coverageLabel(shift)}
                          {shift.locked ? " · locked" : ""}
                        </p>
                      </button>
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
