import { getAuth } from "@/lib/auth";
import { getUserAppRole, hasAppRole, type AppRole } from "@/lib/better-auth/roles";
import { getRequestHeaders } from "@tanstack/react-start/server";

export async function requireSessionRoles(allowed: readonly AppRole[]) {
  const headers = getRequestHeaders();
  const session = await (await getAuth()).api.getSession({ headers });

  if (!session?.user) {
    throw new Error("You must be signed in.");
  }

  const role = getUserAppRole(session.user);
  if (!hasAppRole(role, allowed)) {
    throw new Error("You do not have permission to perform this action.");
  }

  return { session, role };
}
