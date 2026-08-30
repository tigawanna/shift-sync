import { defineConfig } from "nitro";
import evlog from "evlog/nitro/v3";

export default defineConfig({
  preset: "vercel",
  inlineDynamicImports: true,
  compatibilityDate: "2025-07-15",
  experimental: {
    asyncContext: true,
  },
  modules: [
    evlog({
      env: { service: "shift-sync" },
      exclude: ["/_build/**", "/assets/**"],
    }),
  ],
});
