import { createFileRoute } from "@tanstack/react-router";
import {
  LandingAccess,
  LandingCTA,
  LandingFeatures,
  LandingFooter,
  LandingHero,
  LandingNavbar,
  LandingShowcase,
} from "./-components/landing";

export const Route = createFileRoute("/")({ component: LandingPage });

function LandingPage() {
  return (
    <div data-test="landing-page" className="bg-base-100 text-base-content min-h-dvh">
      <LandingNavbar />
      <LandingHero />
      <LandingFeatures />
      <LandingShowcase />
      <LandingAccess />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
