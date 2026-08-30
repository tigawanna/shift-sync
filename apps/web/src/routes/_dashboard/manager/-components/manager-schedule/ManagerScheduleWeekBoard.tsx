import type { ManagerWeekSchedule } from "../../-data-access-layer/manager-schedule.fn";

function shiftTimeLabel(shift: ManagerWeekSchedule["days"][number]["shifts"][number]) {
  if (shift.overnight) {
    return `${shift.startTime}–${shift.endTime} (+1)`;
  }
  return `${shift.startTime}–${shift.endTime}`;
}

export function ManagerScheduleWeekBoard({ days }: { days: ManagerWeekSchedule["days"] }) {
  return (
    <div
      className="grid gap-3 md:grid-cols-7"
      data-test="manager-schedule-week"
    >
      {days.map((day) => (
        <section
          key={day.date}
          className="flex min-h-48 flex-col gap-2 rounded-xl border p-3"
          data-test="manager-schedule-day"
        >
          <header>
            <p className="text-xs font-medium tracking-wide uppercase">{day.weekday}</p>
            <p className="text-muted-foreground text-xs tabular-nums">{day.date.slice(5)}</p>
          </header>
          {day.shifts.length === 0 ? (
            <p className="text-muted-foreground text-xs">No shifts</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {day.shifts.map((shift) => (
                <li
                  key={shift.id}
                  className="rounded-lg bg-[#9c4524] px-2.5 py-2 text-[#fff7f0]"
                  data-test="manager-schedule-shift"
                >
                  <p className="text-xs font-semibold">{shift.skillName}</p>
                  <p className="text-[11px] tabular-nums opacity-90">{shiftTimeLabel(shift)}</p>
                  <p className="mt-1 text-[11px] opacity-80">
                    {shift.assignees.length}/{shift.headcountNeeded}
                    {shift.assignees.length > 0
                      ? ` · ${shift.assignees.map((person) => person.name).join(", ")}`
                      : " · unassigned"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
