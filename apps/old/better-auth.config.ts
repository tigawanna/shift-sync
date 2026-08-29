import { createAuth } from "./src/lib/better-auth/auth";
import type { AppDatabase } from "./src/lib/drizzle/client";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3090";

/**
 * CLI entry for `pnpm auth:generate`.
 * Uses the same factory as the server runtime.
 */
export const auth = createAuth({
  db: {} as AppDatabase,
  secret: process.env.BETTER_AUTH_SECRET ?? "cli-only-secret-not-used-at-runtime-32chars",
  baseURL,
  trustedOrigins: [baseURL],
  adminEmail: process.env.ADMIN_EMAIL ?? undefined,
});
