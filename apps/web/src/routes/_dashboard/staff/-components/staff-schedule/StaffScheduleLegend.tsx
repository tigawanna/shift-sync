import { cn } from "@/lib/utils";

function LegendSwatch({ className }: { className: string }) {
  return (
    <span
      className={cn("inline-flex size-4 rounded-full bg-[#1c1917]", className)}
      aria-hidden
    />
  );
}

export function StaffScheduleLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#9c958c]">
      <li className="flex items-center gap-1.5">
        <LegendSwatch className="ring-2 ring-[#e08a52]" />
        Today
      </li>
      <li className="flex items-center gap-1.5">
        <LegendSwatch className="ring-2 ring-[#8b95a7]" />
        Day off
      </li>
    </ul>
  );
}
