import { landingNav } from "@/content/landing";
import { useTheme } from "@/lib/tanstack/router/use-theme";
import { AppConfig } from "@/utils/system";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { LandingNavCta } from "./LandingNavCta";

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, updateTheme } = useTheme();
  const Icon = AppConfig.icon;

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      try {
        document.startViewTransition(() => updateTheme(next));
        return;
      } catch {
        updateTheme(next);
        return;
      }
    }
    updateTheme(next);
  }

  return (
    <header className="bg-base-100/85 sticky top-0 z-50 backdrop-blur-md">
      <div className="border-border/40 mx-auto flex h-19 max-w-6xl items-center justify-between border-b px-6 md:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <Icon className="size-4" />
          <span className="text-base-content text-[15px] font-medium tracking-tight">
            ShiftSync
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {landingNav.links.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-muted-foreground hover:text-primary text-[13px] transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-base-content hidden rounded-md px-3 py-1.5 text-[13px] transition-colors sm:block"
            aria-label="Toggle theme"
          >
            {theme === "light" ? "Dark" : "Light"}
          </button>
          <LandingNavCta />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="text-base-content rounded-md p-2 md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-border/40 space-y-1 border-b px-6 py-4 md:hidden">
          {landingNav.links.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="text-muted-foreground hover:bg-base-200 hover:text-base-content block rounded-md px-3 py-2.5 text-sm"
            >
              {item.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              toggleTheme();
              setMobileOpen(false);
            }}
            className="text-muted-foreground hover:bg-neutral hover:text-base-content block w-full rounded-md px-3 py-2.5 text-left text-sm"
          >
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
        </div>
      ) : null}
    </header>
  );
}
