import { landingFooter, landingNav } from "@/content/landing";
import { AppConfig } from "@/utils/system";
import { Link } from "@tanstack/react-router";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer>
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-12 md:px-10">
        <div className="md:col-span-5">
          <p className="text-base-content text-[15px] font-medium">ShiftSync</p>
          <p className="text-muted-foreground mt-3 max-w-[32ch] text-sm leading-relaxed">
            {AppConfig.description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7 md:justify-items-end">
          <div>
            <p className="text-primary mb-3 text-[11px] tracking-[0.14em] uppercase">Explore</p>
            <div className="flex flex-col gap-2.5 text-sm">
              {landingNav.links.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-base-content mb-3 text-[11px] tracking-[0.14em] uppercase">Legal</p>
            <div className="flex flex-col gap-2.5 text-sm">
              {landingFooter.legal.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-muted-foreground hover:text-base-content transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-base-content mb-3 text-[11px] tracking-[0.14em] uppercase">
              Product
            </p>
            <div className="flex flex-col gap-2.5 text-sm">
              <Link
                to="/auth"
                search={{ returnTo: "/manager" }}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Sign in
              </Link>
              <a
                href={AppConfig.links.github}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-base-content transition-colors"
              >
                GitHub
              </a>
              <a
                href={AppConfig.links.mail}
                className="text-muted-foreground hover:text-base-content transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-border/40 border-t">
        <div className="text-muted-foreground/70 mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 text-[12px] md:flex-row md:items-center md:justify-between md:px-10">
          <span>
            © {currentYear} {AppConfig.name}
          </span>
          <span>{landingFooter.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
