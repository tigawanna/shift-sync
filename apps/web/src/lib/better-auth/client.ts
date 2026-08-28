import type { Auth } from "@/lib/better-auth/auth";
import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { getApiOrigin } from "../client-env";

export const authClient = createAuthClient({
  baseURL: getApiOrigin(),
  basePath: "/api/auth",
  plugins: [adminClient()],
});

export type BetterAuthSession = Auth["$Infer"]["Session"];
