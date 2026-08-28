import { FlagHairline, FlagMark } from "@/components/ui/flag-accents";
import { Reveal } from "@/components/ui/reveal";
import { landingCta } from "@/content/landing";
import { Link } from "@tanstack/react-router";

export function LandingCTA() {
  const [before, after] = landingCta.title.split(landingCta.highlight);

  return (
    <section data-test="landing-cta">
      <FlagHairline className="h-px opacity-80" />
      <div className="mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <FlagHairline className="mx-auto mb-10 h-0.5 w-24 rounded-full" />
          <h2 className="font-display text-base-content text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.02] tracking-[-0.02em] text-balance">
            {before}
            <em className="text-flag-green not-italic">{landingCta.highlight}</em>
            {after}
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 max-w-md text-pretty">
            {landingCta.description}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/auth"
              search={{ returnTo: "/manager" }}
              className="bg-flag-green-solid text-flag-green-content inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-[15px] font-semibold whitespace-nowrap transition-opacity hover:opacity-90"
            >
              <span>{landingCta.primaryCta}</span>
              <FlagMark />
            </Link>
            <a
              href="#capabilities"
              className="border-flag-red/45 text-base-content hover:bg-flag-red-soft rounded-full border px-5 py-3.5 text-[15px] transition-colors"
            >
              {landingCta.secondaryCta}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
