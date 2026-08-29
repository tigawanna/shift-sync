import { currentYearMonth, formatDateInZone, yearMonthOf } from "@/lib/time/zoned";
import type { ReactNode } from "react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type MonthCalendarGridProps = {
  month: string;
  dates: string[];
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  renderCell: (date: string, inMonth: boolean) => ReactNode;
};

export function MonthCalendarGrid({
  month,
  dates,
  selectedDate,
  onSelectDate,
  renderCell,
}: MonthCalendarGridProps) {
  const today = formatDateInZone(new Date(), "UTC");
  const thisMonth = currentYearMonth("UTC");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {WEEKDAYS.map((label) => (
          <p
            key={label}
            className="text-base-content/50 px-1 text-center text-[11px] font-medium tracking-wide uppercase"
          >
            {label}
          </p>
        ))}
      </div>
      <div className="grid min-h-[28rem] flex-1 grid-cols-7 grid-rows-6 gap-1 sm:min-h-[34rem] sm:gap-2">
        {dates.map((date) => {
          const inMonth = yearMonthOf(date) === month;
          const selected = date === selectedDate;
          const isToday = date === today && month === thisMonth;
          const content = (
            <>
              <span
                className={`tabular-nums ${
                  selected
                    ? "text-sm font-semibold"
                    : isToday
                      ? "text-sm font-semibold"
                      : "text-sm font-medium"
                } ${inMonth ? "" : "opacity-40"}`}
              >
                {date.slice(8)}
              </span>
              <div className="mt-1 min-h-0 flex-1">{renderCell(date, inMonth)}</div>
            </>
          );

          const className = `flex h-full min-h-0 flex-col rounded-xl border px-1.5 py-1.5 text-left transition-colors sm:px-2 sm:py-2 ${
            selected
              ? "border-base-content/40 bg-base-300/70"
              : isToday
                ? "border-base-content/25 bg-base-200/50"
                : "border-base-content/10 bg-base-100/70 hover:border-base-content/20"
          }`;

          if (onSelectDate) {
            return (
              <button
                key={date}
                type="button"
                onClick={() => onSelectDate(date)}
                className={className}
              >
                {content}
              </button>
            );
          }

          return (
            <div key={date} className={className}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
