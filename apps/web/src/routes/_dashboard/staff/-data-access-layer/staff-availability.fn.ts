import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import {
  userAvailability as userAvailabilityTable,
  userAvailabilityException as userAvailabilityExceptionTable,
} from "@/lib/drizzle/schema/skills-schema";
import { AVAILABILITY_EXCEPTION_KINDS } from "@/lib/schedule/availability";
import { userLocation } from "@/lib/drizzle/schema/locations-schema";
import { loadLocationManagerIds, notifyUsers } from "@/lib/schedule/notify.server";
import { monthGridDates } from "@/lib/time/zoned";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM");
const civilDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const minuteSchema = z
  .number()
  .int()
  .min(0)
  .max(24 * 60);

export const listMyStaffAvailabilityInputSchema = z.object({
  month: monthSchema,
});

export const addMyAvailabilityExceptionInputSchema = z
  .object({
    date: civilDateSchema,
    kind: z.enum(AVAILABILITY_EXCEPTION_KINDS),
    startMinute: minuteSchema,
    endMinute: minuteSchema,
    note: z.string().trim().max(160).optional(),
  })
  .refine((exception) => exception.startMinute < exception.endMinute, {
    message: "The exception must end after it starts.",
  });

export const removeMyAvailabilityExceptionsInputSchema = z.object({
  date: civilDateSchema,
  kind: z.enum(AVAILABILITY_EXCEPTION_KINDS).optional(),
});

export type ListMyStaffAvailabilityInput = z.infer<typeof listMyStaffAvailabilityInputSchema>;
export type AddMyAvailabilityExceptionInput = z.infer<typeof addMyAvailabilityExceptionInputSchema>;

function parseExceptionKind(kind: string) {
  if (kind === "blocked" || kind === "extra") return kind;
  return AVAILABILITY_EXCEPTION_KINDS[0];
}

async function loadMyStaffAvailability(month: string, userId: string) {
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

export type StaffAvailabilityResult = Awaited<ReturnType<typeof loadMyStaffAvailability>>;
export type StaffAvailabilityException = StaffAvailabilityResult["exceptions"][number];
export type StaffWeeklyWindow = StaffAvailabilityResult["weeklyWindows"][number];

export const listMyStaffAvailability = createServerFn({ method: "GET" })
  .validator((data: ListMyStaffAvailabilityInput) => listMyStaffAvailabilityInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    return loadMyStaffAvailability(data.month, session.user.id);
  });

export const addMyAvailabilityException = createServerFn({ method: "POST" })
  .validator((data: AddMyAvailabilityExceptionInput) =>
    addMyAvailabilityExceptionInputSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    const db = await getDb();
    const userId = session.user.id;

    await db.insert(userAvailabilityExceptionTable).values({
      id: crypto.randomUUID(),
      userId,
      date: data.date,
      kind: data.kind,
      startMinute: data.startMinute,
      endMinute: data.endMinute,
      note: data.note?.trim() || null,
    });

    const locations = await db
      .select({ locationId: userLocation.locationId })
      .from(userLocation)
      .where(eq(userLocation.userId, userId));
    const managerIds = (
      await Promise.all(locations.map((row) => loadLocationManagerIds(db, row.locationId)))
    ).flat();
    await notifyUsers(db, managerIds, {
      kind: "availability",
      title: "Staff availability changed",
      body: `${session.user.name} added an availability exception.`,
    });

    return { ok: true as const };
  });

export const removeMyAvailabilityExceptionsOnDate = createServerFn({ method: "POST" })
  .validator((data: unknown) => removeMyAvailabilityExceptionsInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff]);
    const db = await getDb();
    const userId = session.user.id;

    const filters = [
      eq(userAvailabilityExceptionTable.userId, userId),
      eq(userAvailabilityExceptionTable.date, data.date),
    ];
    if (data.kind) {
      filters.push(eq(userAvailabilityExceptionTable.kind, data.kind));
    }

    await db.delete(userAvailabilityExceptionTable).where(and(...filters));

    return { ok: true as const };
  });
