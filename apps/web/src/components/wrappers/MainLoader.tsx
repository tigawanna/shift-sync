import { SiteIcon } from "@/components/icon/SiteIcon";
import { RouteStatusShell } from "@/lib/tanstack/router/RouteStatusShell";

interface MainLoaderProps {
  className?: string;
  /** Uppercase eyebrow above the headline */
  eyebrow?: string;
  description?: string;
  children?: React.ReactNode;
}

/**
 * Branded full-page pending state — same atmosphere as router error / 404 shells.
 */
export function MainLoader({
  className,
  children,
  eyebrow = "Just a moment",
  description = "Loading ShiftSync…",
}: MainLoaderProps) {
  return (
    <RouteStatusShell
      data-test="main-loader"
      busy
      className={className}
      eyebrow={eyebrow}
      visual={children ?? <SiteIcon size={100} animate aria-hidden />}
      title={
        <>
          Almost <span className="text-brand-teal dark:text-brand-teal-bright">there</span>
        </>
      }
      description={description}
    />
  );
}
