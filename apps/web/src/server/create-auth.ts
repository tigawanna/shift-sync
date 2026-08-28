import type { AppEnv } from "@/env";
import { createAuth } from "@/lib/better-auth/auth";
import type { AppDatabase } from "@/lib/drizzle/client";
import { tanstackStartCookies } from "better-auth/tanstack-start";

/** Maps process env into the shared Better Auth factory. */
export function createAuthFromEnv(env: AppEnv, db: AppDatabase) {
  const trustedOrigins = String(env.CORS_ORIGINS ?? env.BETTER_AUTH_URL)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return createAuth({
    db,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins,
    adminEmail: env.ADMIN_EMAIL || undefined,
    plugins: [tanstackStartCookies()],
  });
}
