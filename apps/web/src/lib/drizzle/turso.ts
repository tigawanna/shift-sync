import path from "node:path";
import { fileURLToPath } from "node:url";

/** apps/web — anchored to this file, not `process.cwd()`. */
export const APP_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/** Default local SQLite when DATABASE_URL is unset. */
export const DEFAULT_DATABASE_URL = "file:./data/shift-sync.db";

/** Remote Turso Cloud — not a local libSQL replica. */
export function isTursoRemote(url: string) {
  return (
    url.startsWith("libsql://") && !url.includes("127.0.0.1") && !url.includes("localhost")
  );
}

/** `file:./data/shift-sync.db` → absolute `file:` under the app root. */
export function resolveDatabaseUrl(url: string) {
  if (!url.startsWith("file:")) {
    return url;
  }

  const raw = url.slice("file:".length);
  const absolute = path.isAbsolute(raw) ? raw : path.join(APP_ROOT, raw);
  return `file:${absolute}`;
}
