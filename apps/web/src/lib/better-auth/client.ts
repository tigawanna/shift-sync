import type { Auth } from "@/lib/better-auth/auth";
import { ac, roles } from "@/lib/better-auth/permissions";
import { adminClient } from "better-auth/client/plugins";
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
  ],
});

export type BetterAuthSession = Auth["$Infer"]["Session"];
