import { getDb } from "@/lib/drizzle/client";
import { userLocation } from "@/lib/drizzle/schema/locations-schema";
import {
  userAvailability as userAvailabilityTable,
  userAvailabilityException as userAvailabilityExceptionTable,
} from "@/lib/drizzle/schema/skills-schema";
import { AVAILABILITY_EXCEPTION_KINDS } from "@/lib/schedule/availability";
import { loadLocationManagerIds, notifyUsers } from "@/lib/schedule/notify.server";
import { monthGridDates } from "@/lib/time/zoned";
import { and, asc, eq, gte, lte } from "drizzle-orm";

function parseExceptionKind(kind: string) {
  if (kind === "blocked" || kind === "extra") return kind;
  return AVAILABILITY_EXCEPTION_KINDS[0];
}

export async function loadStaffAvailabilityForUser(month: string, userId: string) {
  const db = await getDb();
  const grid = monthGridDates(month);
  const rangeStart = grid[0] ?? `${month}-01`;
  const rangeEnd = grid[grid.length - 1] ?? `${month}-28`;

  const [weeklyRows, exceptionRows] = await Promise.all([
    db
      .select({
        weekday: userAvailabilityTable.weekday,
        startMinute: userAvailabilityTable.startMinute,
        endMinute: userAvailabilityTable.endMinute,
      })
      .from(userAvailabilityTable)
      .where(eq(userAvailabilityTable.userId, userId))
      .orderBy(asc(userAvailabilityTable.weekday), asc(userAvailabilityTable.startMinute)),
    db
      .select({
        id: userAvailabilityExceptionTable.id,
        date: userAvailabilityExceptionTable.date,
        kind: userAvailabilityExceptionTable.kind,
        startMinute: userAvailabilityExceptionTable.startMinute,
        endMinute: userAvailabilityExceptionTable.endMinute,
        note: userAvailabilityExceptionTable.note,
      })
      .from(userAvailabilityExceptionTable)
      .where(
        and(
          eq(userAvailabilityExceptionTable.userId, userId),
          gte(userAvailabilityExceptionTable.date, rangeStart),
          lte(userAvailabilityExceptionTable.date, rangeEnd),
        ),
      )
      .orderBy(
        asc(userAvailabilityExceptionTable.date),
        asc(userAvailabilityExceptionTable.startMinute),
      ),
  ]);

  return {
    month,
    weeklyWindows: weeklyRows,
    exceptions: exceptionRows.map((row) => ({
      id: row.id,
      date: row.date,
      kind: parseExceptionKind(row.kind),
      startMinute: row.startMinute,
      endMinute: row.endMinute,
      note: row.note ?? null,
    })),
  };
}

export type StaffAvailabilityResult = Awaited<ReturnType<typeof loadStaffAvailabilityForUser>>;
export type StaffAvailabilityException = StaffAvailabilityResult["exceptions"][number];
export type StaffWeeklyWindow = StaffAvailabilityResult["weeklyWindows"][number];

export async function insertAvailabilityException(input: {
  userId: string;
  userName: string;
  date: string;
  kind: (typeof AVAILABILITY_EXCEPTION_KINDS)[number];
  startMinute: number;
  endMinute: number;
  note?: string;
}) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.insert(userAvailabilityExceptionTable).values({
      id: crypto.randomUUID(),
      userId: input.userId,
      date: input.date,
      kind: input.kind,
      startMinute: input.startMinute,
      endMinute: input.endMinute,
      note: input.note?.trim() || null,
    });

    const locations = await tx
      .select({ locationId: userLocation.locationId })
      .from(userLocation)
      .where(eq(userLocation.userId, input.userId));
    const managerIds = (
      await Promise.all(locations.map((row) => loadLocationManagerIds(tx, row.locationId)))
    ).flat();
    await notifyUsers(tx, managerIds, {
      kind: "availability",
      title: "Staff availability changed",
      body: `${input.userName} added an availability exception.`,
    });
  });
}

export async function deleteAvailabilityExceptionsOnDate(input: {
  userId: string;
  date: string;
  kind?: (typeof AVAILABILITY_EXCEPTION_KINDS)[number];
}) {
  const db = await getDb();
  const filters = [
    eq(userAvailabilityExceptionTable.userId, input.userId),
    eq(userAvailabilityExceptionTable.date, input.date),
  ];
  if (input.kind) {
    filters.push(eq(userAvailabilityExceptionTable.kind, input.kind));
  }
  await db.delete(userAvailabilityExceptionTable).where(and(...filters));
}
