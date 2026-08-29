import { FlagHairline } from "@/components/ui/flag-accents";
import { AppConfig } from "@/utils/system";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type LegalSection = {
  heading: string;
  body: string;
};

type LegalDocumentLayoutProps = {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: readonly LegalSection[];
  currentPath: "/privacy" | "/terms";
};

const LEGAL_LINKS: {
  label: string;
  to: "/privacy" | "/terms";
}[] = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
];

export function LegalDocumentLayout({
  title,
  lastUpdated,
  intro,
  sections,
  currentPath,
}: LegalDocumentLayoutProps) {
  return (
    <div className="bg-base-100 min-h-dvh">
      <header className="bg-base-100/85 backdrop-blur-md">
        <FlagHairline className="h-0.5" />
        <div className="border-border/40 mx-auto flex max-w-3xl items-center justify-between border-b px-6 py-5">
          <Link
            to="/"
            className="text-base-content hover:text-flag-green text-sm font-medium tracking-tight transition-colors"
          >
            Geo<span className="text-flag-red">Kenya</span>
          </Link>
          <span className="text-muted-foreground text-[11px]">Updated {lastUpdated}</span>
        </div>
      </header>

      <nav aria-label="Legal documents" className="border-border/40 border-b">
        <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-6 py-3">
          {LEGAL_LINKS.map((link) => {
            const active = link.to === currentPath;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={
                  active
                    ? "bg-flag-green-solid text-flag-green-content rounded-full px-4 py-1.5 text-xs font-medium"
                    : "text-muted-foreground hover:bg-flag-green-soft hover:text-base-content rounded-md px-4 py-1.5 text-xs transition-colors"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <p className="text-flag-green mb-3 text-[11px] tracking-[0.14em] uppercase">Compliance</p>
        <h1 className="font-display text-base-content mb-4 text-4xl font-normal tracking-[-0.02em] text-balance md:text-5xl">
          {title}
        </h1>
        <p className="text-muted-foreground mb-12 max-w-[62ch] text-base leading-relaxed text-pretty md:text-lg">
          {intro}
        </p>

        <div className="space-y-10">
          {sections.map((section) => (
            <LegalSectionBlock key={section.heading} heading={section.heading}>
              {section.body}
            </LegalSectionBlock>
          ))}
        </div>

        <div className="border-border/50 mt-16 border-t pt-8">
          <Link
            to="/"
            className="text-muted-foreground hover:text-flag-green inline-flex items-center gap-2 text-sm transition-colors"
          >
            ← Back to {AppConfig.name}
          </Link>
        </div>
      </main>
    </div>
  );
}

function LegalSectionBlock({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-base-content mb-3 text-xl font-normal tracking-tight">
        {heading}
      </h2>
      <p className="text-muted-foreground max-w-[62ch] leading-relaxed text-pretty">{children}</p>
    </section>
  );
}
