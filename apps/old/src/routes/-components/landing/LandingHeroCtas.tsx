import { FlagMark } from "@/components/ui/flag-accents";
import { landingHero } from "@/content/landing";
import { Link } from "@tanstack/react-router";

const primaryClass =
  "inline-flex items-center gap-3 rounded-full bg-flag-green-solid px-6 py-3.5 text-[15px] font-semibold whitespace-nowrap text-flag-green-content transition-opacity hover:opacity-90";

const secondaryClass =
  "inline-flex items-center gap-2 rounded-full border border-flag-green/35 bg-flag-green-soft px-6 py-3.5 text-[15px] font-medium whitespace-nowrap text-base-content transition-colors hover:border-flag-green/60";

export function LandingHeroCtas() {
  return (
    <div
      className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
      style={{ animationDelay: "340ms" }}
    >
      <Link to="/auth" search={{ returnTo: "/manager" }} className={primaryClass}>
        <span>{landingHero.primaryCta}</span>
        <FlagMark />
      </Link>
      <a href="#capabilities" className={secondaryClass}>
        <span>{landingHero.secondaryCta}</span>
      </a>
    </div>
  );
}
