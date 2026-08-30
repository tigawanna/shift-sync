import { Input } from "@/components/ui/input";

export function StaffScheduleDesiredHours({
  weekStart,
  hours,
  pending,
  readOnly = false,
  onSave,
}: {
  weekStart: string;
  hours: number | null;
  pending: boolean;
  readOnly?: boolean;
  onSave: (weekStartDate: string, hours: number | null) => void;
}) {
  return (
    <label className="bg-card flex flex-col gap-0.5 border-t px-1 py-1">
      <span className="text-muted-foreground text-[9px] leading-none font-medium tracking-wide uppercase">
        Want
      </span>
      <Input
        key={`${weekStart}:${hours ?? "none"}`}
        type="number"
        min={0}
        max={60}
        step={1}
        defaultValue={hours ?? ""}
        disabled={pending || readOnly}
        readOnly={readOnly}
        aria-label={`Desired hours the week of ${weekStart}`}
        className="h-7 px-1 text-center text-[11px] tabular-nums"
        onBlur={(event) => {
          if (readOnly) return;
          const raw = event.target.value.trim();
          if (raw === "") {
            if (hours !== null) onSave(weekStart, null);
            return;
          }
          const next = Number(raw);
          if (!Number.isInteger(next) || next < 0 || next > 60) return;
          if (next !== hours) onSave(weekStart, next);
        }}
      />
    </label>
  );
}
