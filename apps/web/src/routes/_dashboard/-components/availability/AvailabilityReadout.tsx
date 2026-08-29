import type {
  StaffAvailabilityException,
  StaffWeeklyWindow,
} from "@/data-access-layer/staff-profile/staff-profile.types";
import { minutesToHm } from "@/lib/schedule/availability";
import { WEEKDAY_LABELS, formatDayLabel } from "@/lib/time/zoned";

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

type AvailabilityReadoutProps = {
  weeklyWindows: StaffWeeklyWindow[];
  exceptions: StaffAvailabilityException[];
};

export function AvailabilityReadout({ weeklyWindows, exceptions }: AvailabilityReadoutProps) {
  return (
    <details
      className="border-base-content/10 bg-base-100/70 rounded-2xl border"
      data-test="user-availability-readout"
    >
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
        Availability
        <span className="text-base-content/50 font-normal">
          {weeklyWindows.length === 0
            ? " · no weekly windows (open)"
            : ` · ${weeklyWindows.length} weekly window${weeklyWindows.length === 1 ? "" : "s"}`}
          {exceptions.length > 0 ? ` · ${exceptions.length} exception${exceptions.length === 1 ? "" : "s"}` : ""}
        </span>
      </summary>
      <div className="flex flex-col gap-4 px-5 pb-5">
        <p className="text-base-content/70 text-sm">
          Staff set these themselves. Times are wall-clock and checked in each restaurant&apos;s
          timezone.
        </p>
        <ul className="flex flex-col gap-2 text-sm">
          {WEEKDAY_ORDER.map((weekday) => {
            const windows = weeklyWindows.filter((window) => window.weekday === weekday);
            return (
              <li key={weekday} className="flex gap-3">
                <span className="text-base-content/50 w-10 shrink-0">{WEEKDAY_LABELS[weekday]}</span>
                <span>
                  {windows.length === 0
                    ? "—"
                    : windows
                        .map((window) => `${minutesToHm(window.startMinute)}–${minutesToHm(window.endMinute)}`)
                        .join(", ")}
                </span>
              </li>
            );
          })}
        </ul>
        {exceptions.length > 0 ? (
          <ul className="flex flex-col gap-2 text-sm">
            {exceptions.map((exception) => (
              <li key={exception.id} className="border-base-content/10 rounded-xl border px-3 py-2">
                <span className="font-medium">
                  {exception.kind === "blocked" ? "Off" : "Extra"} · {formatDayLabel(exception.date)}
                </span>
                <span className="text-base-content/60">
                  {" "}
                  {minutesToHm(exception.startMinute)}–{minutesToHm(exception.endMinute)}
                </span>
                {exception.note ? (
                  <p className="text-base-content/50 mt-0.5 text-xs">{exception.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
