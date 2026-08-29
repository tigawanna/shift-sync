import { lazy, Suspense, type ReactNode } from "react";

const TanstackDevtools = lazy(() =>
  import("@/lib/tanstack/devtools/devtools").then((module) => ({
    default: module.TanstackDevtools,
  })),
);
import {
  TanstackQueryProvider,
  getTanstackQueryContext,
} from "@/lib/tanstack/query/query-provider";
import { ThemeProvider } from "@/lib/tanstack/router/theme-provider";
import { viewerqueryOptions, type TViewer } from "@/data-access-layer/auth/viewer";
import { AppConfig } from "@/utils/system";
import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { evlogErrorHandler } from "evlog/nitro/v3";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import appCss from "../styles.css?url";

const evlogMiddleware = createMiddleware().server(evlogErrorHandler);

interface RouterContext {
  queryClient: QueryClient;
  viewer?: TViewer;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  server: {
    middleware: [evlogMiddleware],
  },
  beforeLoad: async ({ context }) => {
    const viewer = await context.queryClient.ensureQueryData(viewerqueryOptions);
    return { viewer: viewer.data ?? undefined };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: AppConfig.name },
      { name: "description", content: AppConfig.description || AppConfig.name },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon-96x96.png", sizes: "96x96" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootDocument,
  component: RootApp,
});

function RootApp() {
  const { queryClient } = getTanstackQueryContext();

  return (
    <ThemeProvider storageKey={AppConfig.themeStorageKey}>
      <TanstackQueryProvider queryClient={queryClient}>
        <TooltipProvider>
          <Outlet />
          <Toaster position="bottom-left" />
          {import.meta.env.DEV ? (
            <Suspense fallback={null}>
              <TanstackDevtools />
            </Suspense>
          ) : null}
        </TooltipProvider>
      </TanstackQueryProvider>
    </ThemeProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
