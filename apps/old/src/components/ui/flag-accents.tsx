import { cn } from "@/lib/utils";

/**
 * Compact brand mark — circular progress arc (Pretty Progress–style).
 * Kept as FlagMark for existing call sites.
 */
export function FlagMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("relative inline-flex size-5 shrink-0 items-center justify-center", className)}
    >
      <svg viewBox="0 0 24 24" className="size-full" fill="none">
        <circle
          cx="12"
          cy="12"
          r="9"
          className="stroke-base-content/15 dark:stroke-base-content/25"
          strokeWidth="3"
        />
        <circle
          cx="12"
          cy="12"
          r="9"
          className="stroke-brand-teal"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="42 56"
          transform="rotate(-90 12 12)"
        />
      </svg>
    </span>
  );
}

/** Soft teal → navy gradient hairline */
export function FlagHairline({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "from-brand-navy via-brand-teal to-brand-teal-bright h-px w-full bg-linear-to-r",
        className,
      )}
    />
  );
}

/** Tiny status pulse using brand teal */
export function FlagPulseDot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex size-1.5", className)}>
      <span className="bg-brand-teal absolute inset-0 animate-ping rounded-full opacity-40" />
      <span className="bg-brand-teal relative size-1.5 rounded-full" />
    </span>
  );
}

/** Circular progress spinner for loading surfaces */
export function BrandProgressRing({ className, size = 56 }: { className?: string; size?: number }) {
  const showHalo = size >= 28;

  return (
    <span
      aria-hidden
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {showHalo ? (
        <span
          className="bg-brand-teal/10 dark:bg-brand-teal/15 absolute inset-0 rounded-full"
          style={{ transform: "scale(1.35)" }}
        />
      ) : null}
      <svg viewBox="0 0 48 48" className="animate-progress-spin size-full" fill="none">
        <circle
          cx="24"
          cy="24"
          r="18"
          className="stroke-base-content/10 dark:stroke-base-content/20"
          strokeWidth="4"
        />
        <circle
          cx="24"
          cy="24"
          r="18"
          className="stroke-brand-teal"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="70 113"
          transform="rotate(-90 24 24)"
        />
      </svg>
    </span>
  );
}

export const FLAG_STEP_ACCENTS = [
  { text: "text-flag-green", bar: "bg-flag-green-solid", soft: "bg-flag-green-soft" },
  { text: "text-flag-red", bar: "bg-flag-red-solid", soft: "bg-flag-red-soft" },
  { text: "text-base-content", bar: "bg-base-content", soft: "bg-base-content/8" },
] as const;
