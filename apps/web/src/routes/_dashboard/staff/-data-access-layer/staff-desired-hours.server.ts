import { getDb } from "@/lib/drizzle/client";
import { staffDesiredHours } from "@/lib/drizzle/schema/staff-preferences-schema";
import { addMonthsYm, monthGridDates, monthStartYmd } from "@/lib/time/zoned";
import { and, eq, gte, lte } from "drizzle-orm";

export async function loadDesiredHoursForMonth(userId: string, month: string) {
  const grid = monthGridDates(month);
  const rangeStart = grid[0] ?? monthStartYmd(month);
  const rangeEnd = grid[grid.length - 1] ?? monthStartYmd(addMonthsYm(month, 1));

  const db = await getDb();
  const rows = await db
    .select({
      weekStartDate: staffDesiredHours.weekStartDate,
      hours: staffDesiredHours.hours,
    })
    .from(staffDesiredHours)
    .where(
      and(
        eq(staffDesiredHours.userId, userId),
        gte(staffDesiredHours.weekStartDate, rangeStart),
        lte(staffDesiredHours.weekStartDate, rangeEnd),
      ),
    );

  const byWeek: Record<string, number> = {};
  for (const row of rows) byWeek[row.weekStartDate] = row.hours;
  return { byWeek };
}

export async function upsertDesiredHoursForWeek(
  userId: string,
  weekStartDate: string,
  hours: number | null,
) {
  const db = await getDb();

  if (hours === null) {
    await db
      .delete(staffDesiredHours)
      .where(
        and(
          eq(staffDesiredHours.userId, userId),
          eq(staffDesiredHours.weekStartDate, weekStartDate),
        ),
      );
    return { weekStartDate, hours: null };
  }

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: staffDesiredHours.id })
      .from(staffDesiredHours)
      .where(
        and(
          eq(staffDesiredHours.userId, userId),
          eq(staffDesiredHours.weekStartDate, weekStartDate),
        ),
      )
      .then((rows) => rows[0]);

    if (existing) {
      await tx
        .update(staffDesiredHours)
        .set({ hours })
        .where(eq(staffDesiredHours.id, existing.id));
      return;
    }

    await tx.insert(staffDesiredHours).values({
      id: crypto.randomUUID(),
      userId,
      weekStartDate,
      hours,
    });
  });

  return { weekStartDate, hours };
}
