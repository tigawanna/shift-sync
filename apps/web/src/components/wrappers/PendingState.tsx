import { SiteIcon } from "@/components/icon/SiteIcon";
import { cn } from "@/lib/utils";

type PendingStateProps = {
  className?: string;
  /** Optional visible label under the icon. Defaults to a screen-reader-only “Loading”. */
  label?: string;
  /** Icon size. Default fits in-panel list / card pending. */
  size?: number;
};

/**
 * In-layout pending state — same animated SiteIcon as MainLoader / Spinner.
 * Use for query `isPending` inside scaffolds; use MainLoader only for full-route pending.
 */
export function PendingState({ className, label, size = 200 }: PendingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy
      data-test="pending-state"
      className={cn(
        "flex min-h-48 w-full flex-col items-center justify-center gap-4 py-10",
        className,
      )}
    >
      <SiteIcon size={size} animate aria-hidden />
      {label ? (
        <p className="text-muted-foreground text-sm">{label}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}
