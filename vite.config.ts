import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    printWidth: 100,
    sortTailwindcss: {},
    sortPackageJson: false,
    ignorePatterns: [
      "pnpm-lock.yaml",
      "**/pnpm-lock.yaml",
      "**/routeTree.gen.ts",
      "dist",
      ".output",
      ".wrangler",
      "node_modules",
      ".turbo",
      "drizzle/meta",
      ".agents",
      "apps/mobile",
      "SiteIcon.tsx",
      "favicon",
      "expo-icons",
      "docs",
      "*.md",
    ],
  },
});
