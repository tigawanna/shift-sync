import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import evlog from "evlog/vite";
import { nitro } from "nitro/vite";
import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: { "*": "vp check --fix" },
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
  plugins: [
    devtools(),
    evlog({ service: "shift-sync" }),
    nitro(),
    tailwindcss(),
    tanstackStart({
      importProtection: {
        behavior: {
          dev: "mock",
          build: "mock",
        },
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
  ],
});
