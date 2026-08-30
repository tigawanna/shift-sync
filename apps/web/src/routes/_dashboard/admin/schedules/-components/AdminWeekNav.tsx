import { addDaysYmd } from "@/lib/time/zoned";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function AdminWeekNav({
  weekStart,
  onChange,
}: {
  weekStart: string;
  onChange: (weekStart: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => onChange(addDaysYmd(weekStart, -7))}
      >
        <ChevronLeft className="size-4" />
        Previous week
      </button>
      <p className="text-sm font-medium tabular-nums">Week of {weekStart}</p>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => onChange(addDaysYmd(weekStart, 7))}
      >
        Next week
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
