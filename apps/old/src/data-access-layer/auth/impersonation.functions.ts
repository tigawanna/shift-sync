import { getAuth } from "@/lib/auth";
import { ROLE } from "@/lib/better-auth/roles";
import { parseAppRole } from "@/lib/better-auth/roles";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { getDb } from "@/lib/drizzle/client";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSessionRoles } from "../team/team.auth";

const impersonateUserInputSchema = z.object({
  userId: z.string().min(1),
});

export type ImpersonateUserInput = z.infer<typeof impersonateUserInputSchema>;

/** Starts impersonating a staff (or manager, for admins) account. */
export const impersonateUser = createServerFn({ method: "POST" })
  .validator((data: ImpersonateUserInput) => impersonateUserInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { role } = await requireSessionRoles([ROLE.admin, ROLE.manager]);

    const db = await getDb();
    const [target] = await db
      .select({ id: userTable.id, role: userTable.role, banned: userTable.banned })
      .from(userTable)
      .where(eq(userTable.id, data.userId))
      .limit(1);

    if (!target) {
      throw new Error("User not found.");
    }

    if (target.banned) {
      throw new Error("Cannot impersonate a banned user.");
    }

    const targetRole = parseAppRole(target.role);

    if (targetRole === ROLE.admin) {
      throw new Error("Cannot impersonate an admin account.");
    }

    if (role === ROLE.manager && targetRole !== ROLE.staff) {
      throw new Error("Managers can only impersonate staff members.");
    }

    const headers = getRequestHeaders();
    const auth = await getAuth();

    const result = await auth.api.impersonateUser({
      headers,
      body: { userId: data.userId },
    });

    if (!result) {
      throw new Error("Could not start impersonation.");
    }

    return { userId: data.userId, role: targetRole };
  });

/** Ends the current impersonation session. */
export const stopImpersonating = createServerFn({ method: "POST" }).handler(async () => {
  const headers = getRequestHeaders();
  const auth = await getAuth();

  await auth.api.stopImpersonating({ headers });
  return { success: true };
});
