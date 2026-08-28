import { SiteIcon } from "@/components/icon/SiteIcon";
import { cn } from "@/lib/utils";

type SpinnerProps = {
  className?: string;
  /** Pixel size of the animated site icon. */
  size?: number;
};

/**
 * Compact branded loading indicator — animated SiteIcon.
 * Prefer this over ad-hoc Loader2 / animate-spin circles.
 */
function Spinner({ className, size = 16 }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
    >
      <SiteIcon size={size} animate aria-hidden />
    </span>
  );
}

export { Spinner };
