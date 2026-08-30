import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { staffDesiredHours } from "@/lib/drizzle/schema/staff-preferences-schema";
import { addMonthsYm, monthGridDates, monthStartYmd } from "@/lib/time/zoned";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM");
const mondaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const listMyDesiredHoursInputSchema = z.object({
  month: monthSchema,
});

export const upsertMyDesiredHoursInputSchema = z.object({
  weekStartDate: mondaySchema,
  hours: z.number().int().min(0).max(60).nullable(),
});

export type ListMyDesiredHoursInput = z.infer<typeof listMyDesiredHoursInputSchema>;

export const listMyDesiredHours = createServerFn({ method: "GET" })
  .validator(listMyDesiredHoursInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    const grid = monthGridDates(data.month);
    const rangeStart = grid[0] ?? monthStartYmd(data.month);
    const rangeEnd = grid[grid.length - 1] ?? monthStartYmd(addMonthsYm(data.month, 1));

    const db = await getDb();
    const rows = await db
      .select({
        weekStartDate: staffDesiredHours.weekStartDate,
        hours: staffDesiredHours.hours,
      })
      .from(staffDesiredHours)
      .where(
        and(
          eq(staffDesiredHours.userId, session.user.id),
          gte(staffDesiredHours.weekStartDate, rangeStart),
          lte(staffDesiredHours.weekStartDate, rangeEnd),
        ),
      );

    const byWeek: Record<string, number> = {};
    for (const row of rows) byWeek[row.weekStartDate] = row.hours;
    return { byWeek };
  });

export const upsertMyDesiredHours = createServerFn({ method: "POST" })
  .validator(upsertMyDesiredHoursInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    const db = await getDb();

    if (data.hours === null) {
      await db
        .delete(staffDesiredHours)
        .where(
          and(
            eq(staffDesiredHours.userId, session.user.id),
            eq(staffDesiredHours.weekStartDate, data.weekStartDate),
          ),
        );
      return { weekStartDate: data.weekStartDate, hours: null };
    }

    const existing = await db
      .select({ id: staffDesiredHours.id })
      .from(staffDesiredHours)
      .where(
        and(
          eq(staffDesiredHours.userId, session.user.id),
          eq(staffDesiredHours.weekStartDate, data.weekStartDate),
        ),
      )
      .then((rows) => rows[0]);

    if (existing) {
      await db
        .update(staffDesiredHours)
        .set({ hours: data.hours })
        .where(eq(staffDesiredHours.id, existing.id));
    } else {
      await db.insert(staffDesiredHours).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        weekStartDate: data.weekStartDate,
        hours: data.hours,
      });
    }

    return { weekStartDate: data.weekStartDate, hours: data.hours };
  });
