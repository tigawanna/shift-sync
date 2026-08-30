import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { location as locationTable, userLocation } from "@/lib/drizzle/schema/locations-schema";
import {
  scheduleWeek as scheduleWeekTable,
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import { skill as skillTable, userSkill } from "@/lib/drizzle/schema/skills-schema";
import { addDaysYmd, mondayOfWeekContaining, zonedWallTimeToUtc } from "@/lib/time/zoned";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, gt, lt, ne } from "drizzle-orm";
import { z } from "zod";
import { assertManagerLocationAccess } from "./manager-locations.server";
import { cutoffInstant, EDIT_CUTOFF_HOURS } from "./manager-schedule.fn";

const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}/);

export const createManagerShiftInputSchema = z.object({
  locationId: z.string().min(1),
  skillId: z.string().min(1),
  startDate: ymdSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  headcountNeeded: z.number().int().min(1).max(20),
  notes: z.string().trim().max(500).optional(),
});

export const updateManagerShiftInputSchema = z.object({
  shiftId: z.string().min(1),
  skillId: z.string().min(1),
  startDate: ymdSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  headcountNeeded: z.number().int().min(1).max(20),
  notes: z.string().trim().max(500).optional(),
});

const shiftIdSchema = z.object({ shiftId: z.string().min(1) });

export const assignManagerShiftInputSchema = z.object({
  shiftId: z.string().min(1),
  userId: z.string().min(1),
});

function wallTime(value: string) {
  return value.slice(0, 5);
}

function resolveShiftRange(input: {
  startDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
}) {
  const startTime = wallTime(input.startTime);
  const endTime = wallTime(input.endTime);
  const startsAt = zonedWallTimeToUtc(input.startDate, startTime, input.timezone);
  const endDate = endTime <= startTime ? addDaysYmd(input.startDate, 1) : input.startDate;
  const endsAt = zonedWallTimeToUtc(endDate, endTime, input.timezone);

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("Shift end must be after start. Overnight shifts can end the next morning.");
  }
  if (endsAt.getTime() - startsAt.getTime() > 16 * 3_600_000) {
    throw new Error("A single shift cannot be longer than 16 hours.");
  }

  return { startsAt, endsAt };
}

function assertCanMutate(startsAt: Date, published: boolean, action: string) {
  if (published && startsAt.getTime() < cutoffInstant().getTime()) {
    throw new Error(
      `Cannot ${action}: this published shift is inside the ${EDIT_CUTOFF_HOURS}-hour cutoff.`,
    );
  }
}

async function getShiftContext(shiftId: string) {
  const db = await getDb();
  const row = await db.query.shift.findFirst({
    where: eq(shiftTable.id, shiftId),
    with: {
      location: true,
      skill: { columns: { id: true, name: true } },
      assignments: { columns: { userId: true } },
    },
  });
  if (!row) throw new Error("Shift not found.");

  const weekStart = mondayOfWeekContaining(row.startsAt, row.location.timezone);
  const [publication] = await db
    .select({ id: scheduleWeekTable.id })
    .from(scheduleWeekTable)
    .where(
      and(
        eq(scheduleWeekTable.locationId, row.locationId),
        eq(scheduleWeekTable.weekStartDate, weekStart),
      ),
    )
    .limit(1);

  return { shift: row, weekStart, published: Boolean(publication) };
}

export const listManagerSkills = createServerFn({ method: "GET" }).handler(async () => {
  await requireSessionRoles([ROLE.manager]);
  const db = await getDb();
  return db
    .select({ id: skillTable.id, name: skillTable.name })
    .from(skillTable)
    .orderBy(asc(skillTable.name));
});

export const listStaffForManagerShift = createServerFn({ method: "GET" })
  .validator(shiftIdSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertManagerLocationAccess(session.user.id, context.shift.locationId);

    const db = await getDb();
    const rows = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
      })
      .from(userTable)
      .innerJoin(
        userLocation,
        and(
          eq(userLocation.userId, userTable.id),
          eq(userLocation.locationId, context.shift.locationId),
        ),
      )
      .innerJoin(
        userSkill,
        and(eq(userSkill.userId, userTable.id), eq(userSkill.skillId, context.shift.skillId)),
      )
      .orderBy(asc(userTable.name));

    const assigned = new Set(context.shift.assignments?.map((row) => row.userId) ?? []);

    return rows.map((person) => ({
      ...person,
      assigned: assigned.has(person.id),
    }));
  });

export const createManagerShift = createServerFn({ method: "POST" })
  .validator(createManagerShiftInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const location = await assertManagerLocationAccess(session.user.id, data.locationId);
    const { startsAt, endsAt } = resolveShiftRange({ ...data, timezone: location.timezone });
    const weekStart = mondayOfWeekContaining(startsAt, location.timezone);
    const db = await getDb();
    const [publication] = await db
      .select({ id: scheduleWeekTable.id })
      .from(scheduleWeekTable)
      .where(
        and(
          eq(scheduleWeekTable.locationId, location.id),
          eq(scheduleWeekTable.weekStartDate, weekStart),
        ),
      )
      .limit(1);

    assertCanMutate(startsAt, Boolean(publication), "create a shift");

    await db.insert(shiftTable).values({
      id: crypto.randomUUID(),
      locationId: location.id,
      skillId: data.skillId,
      startsAt,
      endsAt,
      headcountNeeded: data.headcountNeeded,
      notes: data.notes?.trim() || null,
      createdByUserId: session.user.id,
    });

    return { weekStart };
  });

export const updateManagerShift = createServerFn({ method: "POST" })
  .validator(updateManagerShiftInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertManagerLocationAccess(session.user.id, context.shift.locationId);
    assertCanMutate(context.shift.startsAt, context.published, "edit this shift");

    const { startsAt, endsAt } = resolveShiftRange({
      startDate: data.startDate,
      startTime: data.startTime,
      endTime: data.endTime,
      timezone: context.shift.location.timezone,
    });
    assertCanMutate(startsAt, context.published, "move this shift");

    const db = await getDb();
    await db
      .update(shiftTable)
      .set({
        skillId: data.skillId,
        startsAt,
        endsAt,
        headcountNeeded: data.headcountNeeded,
        notes: data.notes?.trim() || null,
      })
      .where(eq(shiftTable.id, data.shiftId));

    return { weekStart: mondayOfWeekContaining(startsAt, context.shift.location.timezone) };
  });

export const deleteManagerShift = createServerFn({ method: "POST" })
  .validator(shiftIdSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertManagerLocationAccess(session.user.id, context.shift.locationId);
    assertCanMutate(context.shift.startsAt, context.published, "delete this shift");

    const db = await getDb();
    await db.delete(shiftTable).where(eq(shiftTable.id, data.shiftId));
    return { weekStart: context.weekStart };
  });

export const assignManagerShift = createServerFn({ method: "POST" })
  .validator(assignManagerShiftInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertManagerLocationAccess(session.user.id, context.shift.locationId);
    assertCanMutate(context.shift.startsAt, context.published, "change assignments");

    const db = await getDb();
    const [eligible] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .innerJoin(
        userLocation,
        and(
          eq(userLocation.userId, userTable.id),
          eq(userLocation.locationId, context.shift.locationId),
        ),
      )
      .innerJoin(
        userSkill,
        and(eq(userSkill.userId, userTable.id), eq(userSkill.skillId, context.shift.skillId)),
      )
      .where(eq(userTable.id, data.userId))
      .limit(1);

    if (!eligible) {
      throw new Error("Only staff with this skill and location certification can be assigned.");
    }

    const [overlap] = await db
      .select({
        locationName: locationTable.name,
      })
      .from(shiftAssignmentTable)
      .innerJoin(shiftTable, eq(shiftTable.id, shiftAssignmentTable.shiftId))
      .innerJoin(locationTable, eq(locationTable.id, shiftTable.locationId))
      .where(
        and(
          eq(shiftAssignmentTable.userId, data.userId),
          ne(shiftTable.id, data.shiftId),
          lt(shiftTable.startsAt, context.shift.endsAt),
          gt(shiftTable.endsAt, context.shift.startsAt),
        ),
      )
      .limit(1);

    if (overlap) {
      throw new Error(
        `Double-booking: this person is already assigned at ${overlap.locationName} during this time.`,
      );
    }

    await db.insert(shiftAssignmentTable).values({
      id: crypto.randomUUID(),
      shiftId: data.shiftId,
      userId: data.userId,
    });

    return { ok: true as const };
  });

export const unassignManagerShift = createServerFn({ method: "POST" })
  .validator(assignManagerShiftInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertManagerLocationAccess(session.user.id, context.shift.locationId);
    assertCanMutate(context.shift.startsAt, context.published, "change assignments");

    const db = await getDb();
    await db
      .delete(shiftAssignmentTable)
      .where(
        and(
          eq(shiftAssignmentTable.shiftId, data.shiftId),
          eq(shiftAssignmentTable.userId, data.userId),
        ),
      );

    return { ok: true as const };
  });
