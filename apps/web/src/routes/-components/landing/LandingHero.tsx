import { DotGridBackground } from "@/components/ui/dot-grid-background";
import { landingHero } from "@/content/landing";
import { LandingHeroCtas } from "./LandingHeroCtas";

const statsToneClass = {
  green: "text-primary",
  red: "text-secondary",
  neutral: "text-base-content",
} as const;

export function LandingHero() {
  return (
    <section
      data-test="landing-hero"
      className="relative flex min-h-[calc(100dvh-4.75rem)] flex-col items-center justify-center overflow-hidden"
    >
      <DotGridBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-24 text-center md:px-10 md:py-28">
        <p
          className="animate-fade-up text-muted-foreground mb-6 text-[13px] font-medium tracking-[0.08em] text-balance uppercase md:text-sm"
          style={{ animationDelay: "40ms" }}
        >
          {landingHero.stats.map((stat, index) => (
            <span key={stat.label}>
              {index > 0 ? <span className="text-base-content/25 mx-2">·</span> : null}
              <span className={statsToneClass[stat.tone]}>{stat.label}</span>
            </span>
          ))}
        </p>

        <h1
          className="animate-fade-up font-display text-base-content text-[clamp(2.5rem,7vw,4.25rem)] leading-[0.98] font-normal tracking-[-0.03em] text-balance"
          style={{ animationDelay: "140ms" }}
        >
          <span className="text-primary mb-4 block text-[0.42em] font-medium tracking-[0.12em] uppercase">
            ShiftSync
          </span>
          {landingHero.title}
        </h1>

        <p
          className="animate-fade-up text-muted-foreground mt-6 max-w-136 text-[1.05rem] leading-relaxed text-pretty md:text-[1.15rem] md:leading-[1.55]"
          style={{ animationDelay: "240ms" }}
        >
          {landingHero.description}
        </p>

        <LandingHeroCtas />
      </div>
    </section>
  );
}
