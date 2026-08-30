import type { Auth } from "@/lib/better-auth/auth";
import { ac, roles } from "@/lib/better-auth/permissions";
import { adminClient, multiSessionClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { getApiOrigin } from "../client-env";

export const authClient = createAuthClient({
  baseURL: getApiOrigin(),
  basePath: "/api/auth",
  plugins: [
    adminClient({
      ac,
      roles,
    }),
    multiSessionClient(),
  ],
});

export type BetterAuthSession = Auth["$Infer"]["Session"];

export function authClientErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "status" in error && error.status === 429) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (error instanceof Error) return error.message;
  return undefined;
}
