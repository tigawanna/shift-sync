import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { queryManagerHome } from "@/lib/schedule/manager-home.server";
import { createServerFn } from "@tanstack/react-start";
import { loadMyManagerLocations } from "./manager-locations.server";

export const loadManagerHome = createServerFn({ method: "GET" }).handler(async () => {
  const { session } = await requireSessionRoles([ROLE.manager]);
  const locations = await loadMyManagerLocations(session.user.id);
  return queryManagerHome(locations.map((location) => location.id));
});
