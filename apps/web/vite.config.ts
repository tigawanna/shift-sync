import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import evlog from "evlog/vite";
import { nitro } from "nitro/vite";
import { fileURLToPath, URL } from "url";
import { defineConfig, lazyPlugins } from "vite-plus";

export default defineConfig({
  lint: {
    ignorePatterns: ["dist/**", ".output/**", "routeTree.gen.ts"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
    },
  },
  staged: { "*": "vp check --fix" },
  test: {
    // `e2e/` is Playwright; Vitest owns the pure schedule/time units.
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
  server: {
    host: "::",
  },
  ssr: {
    optimizeDeps: {
      exclude: ["better-auth"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    tsconfigPaths: true,
  },
  // The unit suite covers pure modules; the Start/Nitro plugin chain would only
  // pull React and the server runtime into a node test environment.
  plugins: process.env.VITEST
    ? []
    : lazyPlugins(() => [
        devtools(),
        evlog({ service: "shift-sync" }),
        nitro({
          // Vite 8.2 / Rolldown splits the SSR service and re-exports undeclared `ssr_exports`.
          // https://github.com/TanStack/router/issues/8031
          inlineDynamicImports: true,
        }),
        tailwindcss(),
        tanstackStart({
          importProtection: {
            client: {
              files: [
                "**/*.server.*",
                "**/src/lib/auth.ts",
                "**/src/env.ts",
                "**/src/lib/drizzle/client.ts",
                "**/src/lib/drizzle/local-client.ts",
                "**/src/lib/drizzle/http-client.ts",
              ],
            },
          },
          router: {
            routeToken: "layout",
          },
          prerender: {
            enabled: true,
            autoStaticPathsDiscovery: false,
            crawlLinks: false,
            failOnError: true,
            concurrency: 4,
            retryCount: 2,
            retryDelay: 1000,
          },
          pages: [
            { path: "/", prerender: { enabled: true } },
            { path: "/privacy", prerender: { enabled: true } },
            { path: "/terms", prerender: { enabled: true } },
          ],
        }),
        viteReact(),
      ]),
});
