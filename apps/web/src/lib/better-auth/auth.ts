import type { AppDatabase } from "@/lib/drizzle/client";
import * as authSchema from "@/lib/drizzle/schema/auth-schema";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { ac, ROLE, roles } from "@/lib/better-auth/permissions";
import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { multiSession } from "better-auth/plugins";
import { eq } from "drizzle-orm";

export type CreateAuthOptions = {
  db: AppDatabase;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  adminEmail?: string;
  plugins?: BetterAuthPlugin[];
};

/** Shared Better Auth factory used by the server runtime and the CLI config. */
export function createAuth(options: CreateAuthOptions) {
  const { db, secret, baseURL, trustedOrigins, adminEmail, plugins = [] } = options;

  return betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
    secret,
    baseURL,
    basePath: "/api/auth",
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (createdUser) => ({
            data: { ...createdUser, emailVerified: true },
          }),
          after: async (createdUser) => {
            if (adminEmail && createdUser.email === adminEmail) {
              await db
                .update(userTable)
                .set({ role: ROLE.admin })
                .where(eq(userTable.id, createdUser.id));
            }
          },
        },
      },
    },
    plugins: [
      admin({
        ac,
        roles,
        defaultRole: ROLE.staff,
        impersonationSessionDuration: 60 * 60 * 8,
      }),
      multiSession({ maximumSessions: 10 }),
      ...plugins,
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
