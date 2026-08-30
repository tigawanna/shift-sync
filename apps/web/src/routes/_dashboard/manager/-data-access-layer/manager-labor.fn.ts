import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { loadLaborReport } from "@/lib/schedule/labor.server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertManagerLocationAccess } from "./manager-locations.server";

export const managerLaborInputSchema = z.object({
  locationId: z.string().min(1),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const getManagerLaborReport = createServerFn({ method: "GET" })
  .validator(managerLaborInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    await assertManagerLocationAccess(session.user.id, data.locationId);
    return loadLaborReport(data.locationId, data.weekStart);
  });
