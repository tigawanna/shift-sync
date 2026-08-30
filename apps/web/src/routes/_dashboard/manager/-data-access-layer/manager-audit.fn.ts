import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { scheduleAuditLog } from "@/lib/drizzle/schema/audit-schema";
import { shift as shiftTable } from "@/lib/drizzle/schema/schedule-schema";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { assertManagerLocationAccess } from "./manager-locations.server";

export const listManagerShiftAudit = createServerFn({ method: "GET" })
  .validator(z.object({ shiftId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const db = await getDb();
    const [shift] = await db
      .select({ locationId: shiftTable.locationId })
      .from(shiftTable)
      .where(eq(shiftTable.id, data.shiftId))
      .limit(1);
    if (!shift) throw new Error("Shift not found.");
    await assertManagerLocationAccess(session.user.id, shift.locationId);
    const items = await db
      .select({
        id: scheduleAuditLog.id,
        action: scheduleAuditLog.action,
        beforeJson: scheduleAuditLog.beforeJson,
        afterJson: scheduleAuditLog.afterJson,
        createdAt: scheduleAuditLog.createdAt,
        actorName: userTable.name,
      })
      .from(scheduleAuditLog)
      .innerJoin(userTable, eq(userTable.id, scheduleAuditLog.actorUserId))
      .where(eq(scheduleAuditLog.shiftId, data.shiftId))
      .orderBy(desc(scheduleAuditLog.createdAt));

    return { items };
  });
