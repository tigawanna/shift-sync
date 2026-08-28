/**
 * Copies icons from ./expo-icons (and optional ./favicon) into apps
 * according to expo-icons.config.json.
 *
 * Run: pnpm sync:icons
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type IconsConfig = {
  source: string;
  expo: {
    icon: string;
    splash: { image: string };
    android: { adaptiveIcon: { foregroundImage: string } };
    web: { favicon: string };
  };
  mobile: { root: string; files: Record<string, string> };
  web: { root: string; files: Record<string, string> };
  sync: {
    mobile: Array<{ from: string; to: string }>;
    web: Array<{ from: string; to: string }>;
  };
};

const root = resolve(import.meta.dirname, "..");
const config = JSON.parse(
  readFileSync(join(root, "expo-icons.config.json"), "utf8"),
) as IconsConfig;

function resolveExpoPath(dotted: string): string {
  const parts = dotted.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = config;
  for (const part of parts) {
    cur = cur[part];
  }
  if (typeof cur !== "string") {
    throw new Error(`Expected string path for ${dotted}`);
  }
  return join(root, config.source, cur.replace(/^\.\//, ""));
}

function copy(fromAbs: string, toAbs: string) {
  if (!existsSync(fromAbs)) {
    throw new Error(`Missing source: ${fromAbs}`);
  }
  mkdirSync(dirname(toAbs), { recursive: true });
  copyFileSync(fromAbs, toAbs);
  console.log(`  ${fromAbs.replace(root + "/", "")} → ${toAbs.replace(root + "/", "")}`);
}

console.log("Syncing mobile icons…");
for (const rule of config.sync.mobile) {
  const from = resolveExpoPath(rule.from);
  const to = join(root, config.mobile.root, config.mobile.files[rule.to]);
  copy(from, to);
}

console.log("Syncing web icons…");
for (const rule of config.sync.web) {
  const from = resolveExpoPath(rule.from);
  const to = join(root, config.web.root, config.web.files[rule.to]);
  copy(from, to);
}

// Full favicon pack when present
const faviconDir = join(root, "favicon");
const webPublic = join(root, config.web.root, "public");
const faviconExtras = [
  "favicon.ico",
  "favicon.svg",
  "favicon-96x96.png",
  "apple-touch-icon.png",
  "web-app-manifest-192x192.png",
  "web-app-manifest-512x512.png",
  "site.webmanifest",
];
if (existsSync(faviconDir)) {
  console.log("Syncing favicon pack…");
  for (const file of faviconExtras) {
    const from = join(faviconDir, file);
    if (existsSync(from)) {
      copy(from, join(webPublic, file));
    }
  }
  const png96 = join(faviconDir, "favicon-96x96.png");
  if (existsSync(png96)) {
    copy(png96, join(webPublic, "favicon.png"));
  }
}

console.log("Done.");
