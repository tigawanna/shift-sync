import { FLAG_STEP_ACCENTS, FlagHairline } from "@/components/ui/flag-accents";
import { Reveal } from "@/components/ui/reveal";
import { landingReasons } from "@/content/landing";

export function LandingShowcase() {
  return (
    <section id="why" data-test="landing-showcase" className="scroll-mt-20">
      <FlagHairline className="h-px opacity-80" />
      <div className="mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-32">
        <Reveal className="max-w-2xl">
          <p className="text-flag-green mb-5 inline-flex items-center gap-2 text-[12px] font-medium tracking-[0.14em] uppercase">
            <span className="bg-flag-green size-1.5 rounded-full" />
            Why ShiftSync
          </p>
          <h2 className="font-display text-base-content text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-balance">
            {landingReasons.heading}
          </h2>
          <p className="text-muted-foreground mt-5 max-w-xl text-pretty">
            {landingReasons.description}
          </p>
        </Reveal>

        <div className="border-border/40 bg-border/40 mt-16 grid gap-px overflow-hidden rounded-lg border md:grid-cols-3">
          {landingReasons.items.map((reason, index) => {
            const Icon = reason.icon;
            const accent = FLAG_STEP_ACCENTS[index % FLAG_STEP_ACCENTS.length];
            return (
              <Reveal
                key={reason.title}
                delay={index * 90}
                className="bg-base-100 relative p-8 md:p-10"
              >
                <span className={`absolute inset-x-0 top-0 h-0.5 ${accent.bar}`} />
                <span
                  className={`mb-6 inline-flex size-10 items-center justify-center rounded-md ${accent.soft}`}
                >
                  <Icon className={`size-5 ${accent.text}`} />
                </span>
                <h3 className="text-base-content mb-3 text-lg font-medium tracking-tight">
                  {reason.title}
                </h3>
                <p className="text-muted-foreground text-[15px] leading-relaxed">
                  {reason.description}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
