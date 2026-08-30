import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { createServerFn } from "@tanstack/react-start";
import { loadMyManagerLocations } from "./manager-locations.server";

export const listMyManagerLocations = createServerFn({ method: "GET" }).handler(async () => {
  const { session } = await requireSessionRoles([ROLE.manager]);
  const items = await loadMyManagerLocations(session.user.id);
  return { items };
});
