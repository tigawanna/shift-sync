/** Default local SQLite when DATABASE_URL is unset. */
export const DEFAULT_DATABASE_URL = "file:./data/shift-sync.db";

/** Remote Turso Cloud — not a local libSQL replica. */
export function isTursoRemote(url: string) {
  return url.startsWith("libsql://") && !url.includes("127.0.0.1") && !url.includes("localhost");
}
