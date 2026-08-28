import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

function Empty({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "border-base-content/15 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center",
        className,
      )}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="empty-header" className={cn("flex flex-col gap-1", className)} {...props} />
  );
}

function EmptyTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      data-slot="empty-title"
      className={cn("text-base-content text-base font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-description"
      className={cn("text-base-content/65 max-w-sm text-sm", className)}
      {...props}
    />
  );
}

function EmptyContent({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div data-slot="empty-content" className={cn("mt-1 flex items-center gap-2", className)}>
      {children}
    </div>
  );
}

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle };
