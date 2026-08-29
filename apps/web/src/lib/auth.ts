import "@tanstack/react-start/server-only";
import { getEnv } from "@/env";
import type { Auth } from "@/lib/better-auth/auth";
import { getDb } from "@/lib/drizzle/client";
import { createAuthFromEnv } from "@/server/create-auth";

let auth: Auth | null = null;
let authPromise: Promise<Auth> | null = null;

export async function getAuth() {
  if (auth) {
    return auth;
  }

  authPromise ??= (async () => {
    const db = await getDb();
    auth = createAuthFromEnv(getEnv(), db);
    return auth;
  })();

  return authPromise;
}
