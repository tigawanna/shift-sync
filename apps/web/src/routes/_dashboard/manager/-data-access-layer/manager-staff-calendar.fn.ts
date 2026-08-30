import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { userLocation } from "@/lib/drizzle/schema/locations-schema";
import { loadStaffAvailabilityForUser } from "@/routes/_dashboard/staff/-data-access-layer/staff-availability.fn";
import { loadDesiredHoursForMonth } from "@/routes/_dashboard/staff/-data-access-layer/staff-desired-hours.fn";
import { loadStaffScheduleForUser } from "@/routes/_dashboard/staff/-data-access-layer/staff-schedule.fn";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { loadMyManagerLocations } from "./manager-locations.server";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM");

export const managerStaffCalendarInputSchema = z.object({
  userId: z.string().min(1),
  month: monthSchema,
});

export type ManagerStaffCalendarInput = z.infer<typeof managerStaffCalendarInputSchema>;

async function assertManagerStaffAccess(managerId: string, staffId: string) {
  const locations = await loadMyManagerLocations(managerId);
  const locationIds = locations.map((location) => location.id);
  if (locationIds.length === 0) {
    throw new Error("Staff member not found.");
  }

  const db = await getDb();
  const [person] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
    })
    .from(userTable)
    .innerJoin(userLocation, eq(userLocation.userId, userTable.id))
    .where(
      and(
        eq(userTable.id, staffId),
        eq(userTable.role, ROLE.staff),
        inArray(userLocation.locationId, locationIds),
      ),
    )
    .limit(1);

  if (!person) {
    throw new Error("Staff member not found.");
  }

  return person;
}

export const getManagerStaff = createServerFn({ method: "GET" })
  .validator(z.object({ staffId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    return assertManagerStaffAccess(session.user.id, data.staffId);
  });

export const listManagerStaffSchedule = createServerFn({ method: "GET" })
  .validator(managerStaffCalendarInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    await assertManagerStaffAccess(session.user.id, data.userId);
    return loadStaffScheduleForUser(data.month, data.userId, { publishedOnly: false });
  });

export const listManagerStaffAvailability = createServerFn({ method: "GET" })
  .validator(managerStaffCalendarInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    await assertManagerStaffAccess(session.user.id, data.userId);
    return loadStaffAvailabilityForUser(data.month, data.userId);
  });

export const listManagerStaffDesiredHours = createServerFn({ method: "GET" })
  .validator(managerStaffCalendarInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    await assertManagerStaffAccess(session.user.id, data.userId);
    return loadDesiredHoursForMonth(data.userId, data.month);
  });
