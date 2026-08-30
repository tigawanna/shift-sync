import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { location as locationTable } from "@/lib/drizzle/schema/locations-schema";
import {
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import { loadLocationManagerIds, notifyUsers } from "@/lib/schedule/notify.server";
import { mondayOfWeekContaining } from "@/lib/time/zoned";
import { loadStaffAvailabilityForUser } from "@/routes/_dashboard/staff/-data-access-layer/staff-availability.fn";
import { loadDesiredHoursForMonth } from "@/routes/_dashboard/staff/-data-access-layer/staff-desired-hours.fn";
import { loadStaffScheduleForUser } from "@/routes/_dashboard/staff/-data-access-layer/staff-schedule.fn";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM");

export const adminStaffCalendarInputSchema = z.object({
  userId: z.string().min(1),
  month: monthSchema,
});

export type AdminStaffCalendarInput = z.infer<typeof adminStaffCalendarInputSchema>;

export const requestStaffScheduleChangeInputSchema = z.object({
  staffId: z.string().min(1),
  shiftIds: z.array(z.string().min(1)).min(1),
  note: z.string().trim().min(1).max(500),
});

async function assertAdminStaffExists(userId: string) {
  await requireSessionRoles([ROLE.admin]);
  const db = await getDb();
  const [person] = await db
    .select({ id: userTable.id, name: userTable.name, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (!person || person.role !== ROLE.staff) {
    throw new Error("Staff member not found.");
  }
  return person;
}

export const listAdminStaffSchedule = createServerFn({ method: "GET" })
  .validator(adminStaffCalendarInputSchema)
  .handler(async ({ data }) => {
    await assertAdminStaffExists(data.userId);
    return loadStaffScheduleForUser(data.month, data.userId, { publishedOnly: false });
  });

export const listAdminStaffAvailability = createServerFn({ method: "GET" })
  .validator(adminStaffCalendarInputSchema)
  .handler(async ({ data }) => {
    await assertAdminStaffExists(data.userId);
    return loadStaffAvailabilityForUser(data.month, data.userId);
  });

export const listAdminStaffDesiredHours = createServerFn({ method: "GET" })
  .validator(adminStaffCalendarInputSchema)
  .handler(async ({ data }) => {
    await assertAdminStaffExists(data.userId);
    return loadDesiredHoursForMonth(data.userId, data.month);
  });

export const requestAdminStaffScheduleChange = createServerFn({ method: "POST" })
  .validator(requestStaffScheduleChangeInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.admin]);
    const staff = await assertAdminStaffExists(data.staffId);
    const uniqueShiftIds = [...new Set(data.shiftIds)];
    const db = await getDb();

    const assigned = await db
      .select({
        shiftId: shiftTable.id,
        locationId: shiftTable.locationId,
        locationName: locationTable.name,
        timezone: locationTable.timezone,
        startsAt: shiftTable.startsAt,
      })
      .from(shiftAssignmentTable)
      .innerJoin(shiftTable, eq(shiftAssignmentTable.shiftId, shiftTable.id))
      .innerJoin(locationTable, eq(locationTable.id, shiftTable.locationId))
      .where(
        and(eq(shiftAssignmentTable.userId, data.staffId), inArray(shiftTable.id, uniqueShiftIds)),
      );

    if (assigned.length !== uniqueShiftIds.length) {
      throw new Error("One or more of those shifts are not assigned to this person.");
    }

    const locationIds = [...new Set(assigned.map((row) => row.locationId))];
    const managerIds = (
      await Promise.all(locationIds.map((locationId) => loadLocationManagerIds(db, locationId)))
    ).flat();

    if (managerIds.length === 0) {
      throw new Error("No managers are assigned to the location for this shift.");
    }

    const lead = assigned[0]!;
    const weekStart = mondayOfWeekContaining(lead.startsAt, lead.timezone);
    await notifyUsers(db, managerIds, {
      kind: "schedule_change_request",
      title: `Schedule change requested for ${staff.name}`,
      body: `${session.user.name} asked you to review ${staff.name}'s assignment at ${lead.locationName} (week of ${weekStart}). ${data.note}`,
    });

    return { ok: true as const };
  });
