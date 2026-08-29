import { FlagMark } from "@/components/ui/flag-accents";
import { Link } from "@tanstack/react-router";
import { RouteStatusShell } from "./RouteStatusShell";

export function RouterNotFoundComponent() {
  return (
    <RouteStatusShell
      data-test="router-not-found"
      eyebrow="404"
      visual={
        <span
          aria-hidden
          className="bg-base-200 dark:bg-base-300 inline-flex size-20 items-center justify-center rounded-[20px]"
        >
          <FlagMark className="size-10" />
        </span>
      }
      title="This page doesn’t exist"
      description="The route you followed isn’t here — or it moved. Head home and try again."
      actions={
        <Link
          to="/"
          data-test="router-not-found-home"
          className="bg-primary text-primary-content inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-[15px] font-semibold transition-opacity hover:opacity-90"
        >
          Back home
        </Link>
      }
    />
  );
}
