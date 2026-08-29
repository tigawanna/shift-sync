import { DotGridBackground } from "@/components/ui/dot-grid-background";
import { FlagHairline, FlagPulseDot } from "@/components/ui/flag-accents";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type RouteStatusShellProps = {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  /** Optional mark / loader between the hairline and headline */
  visual?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
  className?: string;
  "data-test"?: string;
};

/**
 * Branded full-viewport shell for router 404 / error / pending surfaces.
 * Clean Pretty Progress language: soft surface, teal accents, bold sans type.
 */
export function RouteStatusShell({
  eyebrow,
  title,
  description,
  visual,
  actions,
  footer,
  busy = false,
  className,
  "data-test": dataTest,
}: RouteStatusShellProps) {
  return (
    <div
      data-test={dataTest}
      role={busy ? "status" : undefined}
      aria-live={busy ? "polite" : undefined}
      aria-busy={busy || undefined}
      className={cn(
        "bg-base-100 text-base-content relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-20",
        className,
      )}
    >
      <div
        aria-hidden
        className="from-base-200/80 via-base-100 to-base-100 pointer-events-none absolute inset-0 bg-linear-to-b"
      />
      <DotGridBackground className="opacity-50 dark:opacity-70" />
      <FlagHairline className="absolute inset-x-0 top-0 z-20 h-0.5 opacity-80" />
      <FlagHairline className="absolute inset-x-0 bottom-0 z-20 h-0.5 opacity-80" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <p className="text-muted-foreground inline-flex items-center gap-2.5 text-[12px] font-semibold tracking-[0.14em] uppercase">
          <FlagPulseDot />
          <span className="text-brand-teal dark:text-brand-teal-bright">{eyebrow}</span>
        </p>

        {visual ? <div className="mt-10">{visual}</div> : null}

        <h1
          className={cn(
            "font-display text-[clamp(2.25rem,7vw,3.25rem)] leading-[1.05] font-bold tracking-[-0.04em] text-balance",
            visual ? "mt-8" : "mt-6",
          )}
        >
          {title}
        </h1>

        {description ? (
          <p className="text-muted-foreground mt-4 max-w-sm text-[1.05rem] leading-relaxed text-pretty">
            {description}
          </p>
        ) : null}

        {actions ? (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">{actions}</div>
        ) : null}
      </div>

      {footer ? <div className="relative z-10 mt-10 w-full max-w-3xl min-w-0">{footer}</div> : null}
    </div>
  );
}
