import { FlagMark } from "@/components/ui/flag-accents";
import { landingHero } from "@/content/landing";
import { Link } from "@tanstack/react-router";

const navLinkClass =
  "inline-flex items-center gap-2 rounded-full border border-flag-green/35 bg-flag-green-soft px-4 py-2 text-[13px] font-medium whitespace-nowrap text-base-content transition-colors hover:border-flag-green/60";

export function LandingNavCta() {
  return (
    <Link to="/auth" search={{ returnTo: "/manager" }} className={navLinkClass}>
      <span>{landingHero.primaryCta}</span>
      <FlagMark className="h-4 w-4" />
    </Link>
  );
}
