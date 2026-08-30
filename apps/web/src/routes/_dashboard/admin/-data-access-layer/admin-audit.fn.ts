import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { scheduleAuditLog } from "@/lib/drizzle/schema/audit-schema";
import { location as locationTable } from "@/lib/drizzle/schema/locations-schema";
import { HQ_TIMEZONE } from "@/lib/schedule/oversight";
import { addDaysYmd, zonedWallTimeToUtc } from "@/lib/time/zoned";
import { createServerFn } from "@tanstack/react-start";
import { and, count, desc, eq, gte, lt, like, or } from "drizzle-orm";
import { z } from "zod";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const listAdminAuditInputSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
  locationId: z.string().optional(),
  from: ymd,
  to: ymd,
});

export type ListAdminAuditInput = z.infer<typeof listAdminAuditInputSchema>;

function rangeWhere(from: string, to: string, locationId?: string, sq?: string) {
  const rangeStart = zonedWallTimeToUtc(from, "00:00", HQ_TIMEZONE);
  const rangeEnd = zonedWallTimeToUtc(addDaysYmd(to, 1), "00:00", HQ_TIMEZONE);
  const trimmed = sq?.trim() ?? "";
  const pattern = `%${trimmed}%`;
  return and(
    gte(scheduleAuditLog.createdAt, rangeStart),
    lt(scheduleAuditLog.createdAt, rangeEnd),
    locationId ? eq(scheduleAuditLog.locationId, locationId) : undefined,
    trimmed
      ? or(
          like(scheduleAuditLog.action, pattern),
          like(userTable.name, pattern),
          like(locationTable.name, pattern),
        )
      : undefined,
  );
}

export const listAdminAudit = createServerFn({ method: "GET" })
  .validator(listAdminAuditInputSchema)
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);
    const page = data.page;
    const perPage = data.perPage;
    const offset = (page - 1) * perPage;
    const where = rangeWhere(data.from, data.to, data.locationId, data.sq);
    const db = await getDb();
    const [rows, totalRow] = await Promise.all([
      db
        .select({
          id: scheduleAuditLog.id,
          action: scheduleAuditLog.action,
          shiftId: scheduleAuditLog.shiftId,
          beforeJson: scheduleAuditLog.beforeJson,
          afterJson: scheduleAuditLog.afterJson,
          createdAt: scheduleAuditLog.createdAt,
          actorName: userTable.name,
          locationName: locationTable.name,
        })
        .from(scheduleAuditLog)
        .innerJoin(userTable, eq(userTable.id, scheduleAuditLog.actorUserId))
        .innerJoin(locationTable, eq(locationTable.id, scheduleAuditLog.locationId))
        .where(where)
        .orderBy(desc(scheduleAuditLog.createdAt))
        .limit(perPage)
        .offset(offset),
      db
        .select({ total: count() })
        .from(scheduleAuditLog)
        .innerJoin(userTable, eq(userTable.id, scheduleAuditLog.actorUserId))
        .innerJoin(locationTable, eq(locationTable.id, scheduleAuditLog.locationId))
        .where(where),
    ]);

    const total = totalRow[0]?.total ?? 0;
    return {
      items: rows,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  });

function csvCell(value: string) {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export const exportAdminAudit = createServerFn({ method: "GET" })
  .validator(listAdminAuditInputSchema.omit({ page: true, perPage: true }))
  .handler(async ({ data }) => {
    await requireSessionRoles([ROLE.admin]);
    const where = rangeWhere(data.from, data.to, data.locationId, data.sq);
    const db = await getDb();
    const rows = await db
      .select({
        action: scheduleAuditLog.action,
        shiftId: scheduleAuditLog.shiftId,
        beforeJson: scheduleAuditLog.beforeJson,
        afterJson: scheduleAuditLog.afterJson,
        createdAt: scheduleAuditLog.createdAt,
        actorName: userTable.name,
        locationName: locationTable.name,
      })
      .from(scheduleAuditLog)
      .innerJoin(userTable, eq(userTable.id, scheduleAuditLog.actorUserId))
      .innerJoin(locationTable, eq(locationTable.id, scheduleAuditLog.locationId))
      .where(where)
      .orderBy(desc(scheduleAuditLog.createdAt));

    const header = ["createdAt", "actor", "action", "location", "shiftId", "before", "after"].join(
      ",",
    );
    const lines = rows.map((row) =>
      [
        csvCell(row.createdAt.toISOString()),
        csvCell(row.actorName),
        csvCell(row.action),
        csvCell(row.locationName),
        csvCell(row.shiftId ?? ""),
        csvCell(row.beforeJson ?? ""),
        csvCell(row.afterJson ?? ""),
      ].join(","),
    );
    return [header, ...lines].join("\n");
  });
