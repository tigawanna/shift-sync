import { FlagHairline, FlagMark } from "@/components/ui/flag-accents";
import { Reveal } from "@/components/ui/reveal";
import { landingAccess } from "@/content/landing";
import { Link } from "@tanstack/react-router";

export function LandingAccess() {
  const copy = landingAccess;

  return (
    <section id="get-app" data-test="landing-access" className="scroll-mt-20">
      <FlagHairline className="h-px opacity-80" />
      <div className="mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-32">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="text-flag-green mb-5 inline-flex items-center gap-2 text-[12px] font-medium tracking-[0.14em] uppercase">
            <span className="bg-flag-red size-1.5 rounded-full" />
            {copy.eyebrow}
          </p>
          <h2 className="font-display text-base-content text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-balance">
            {copy.heading}
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 max-w-120 text-pretty">
            {copy.description}
          </p>
          <div className="mt-10">
            <Link
              to="/auth"
              search={{ returnTo: "/manager" }}
              className="bg-flag-green-solid text-flag-green-content inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold whitespace-nowrap transition-opacity hover:opacity-90"
            >
              <span>{copy.cta}</span>
              <FlagMark />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
