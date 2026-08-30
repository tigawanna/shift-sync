import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { loadOnDutyNow } from "@/lib/schedule/oversight.server";
import { createServerFn } from "@tanstack/react-start";
import { loadMyManagerLocations } from "./manager-locations.server";

export const listManagerOnDutyNow = createServerFn({ method: "GET" }).handler(async () => {
  const { session } = await requireSessionRoles([ROLE.manager]);
  const locations = await loadMyManagerLocations(session.user.id);
  return loadOnDutyNow(locations.map((location) => location.id));
});
