import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { recordScheduleAudit, snapshotShift } from "@/lib/schedule/audit.server";
import { cancelActiveCoverageForShift } from "@/lib/schedule/coverage.server";
import { loadLocationManagerIds, notifyUsers } from "@/lib/schedule/notify.server";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { userLocation } from "@/lib/drizzle/schema/locations-schema";
import {
  scheduleWeek as scheduleWeekTable,
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import { skill as skillTable, userSkill } from "@/lib/drizzle/schema/skills-schema";
import { clipWeeklyHours, WEEKLY_HOURS_LIMIT } from "@/lib/schedule/assign-constraints";
import {
  assertAssignable,
  assertAssigneesStillLegal,
  assertHeadcountAvailable,
  evaluateForUser,
  loadConstraintInputs,
  type AssignShiftContext,
} from "@/lib/schedule/assign.server";
import { addDaysYmd, mondayOfWeekContaining, zonedWallTimeToUtc } from "@/lib/time/zoned";
import { createServerFn } from "@tanstack/react-start";
import { SHIFT_ASSIGN_STAFF_LIMIT } from "@/components/pagination/constants";
import { and, asc, count, eq, inArray, like, notInArray, or } from "drizzle-orm";
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

export const listStaffForManagerShiftInputSchema = z.object({
  shiftId: z.string().min(1),
  q: z.string().optional().default(""),
});

export const assignManagerShiftInputSchema = z.object({
  shiftId: z.string().min(1),
  userId: z.string().min(1),
  overrideReason: z.string().trim().min(8).max(280).optional(),
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

function toAssignShiftContext(shift: Awaited<ReturnType<typeof getShiftContext>>["shift"]) {
  return {
    id: shift.id,
    startsAt: shift.startsAt,
    endsAt: shift.endsAt,
    locationId: shift.locationId,
    skillId: shift.skillId,
    locationName: shift.location.name,
    timezone: shift.location.timezone,
  } satisfies AssignShiftContext;
}

export const listManagerSkills = createServerFn({ method: "GET" }).handler(async () => {
  await requireSessionRoles([ROLE.manager]);
  const db = await getDb();
  return db
    .select({ id: skillTable.id, name: skillTable.name })
    .from(skillTable)
    .orderBy(asc(skillTable.name));
});

function staffNameSearch(q: string) {
  const trimmed = q.trim();
  if (!trimmed) return undefined;
  const pattern = `%${trimmed}%`;
  return or(like(userTable.name, pattern), like(userTable.email, pattern));
}

export const listStaffForManagerShift = createServerFn({ method: "GET" })
  .validator(listStaffForManagerShiftInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertManagerLocationAccess(session.user.id, context.shift.locationId);

    const assignedIds = context.shift.assignments?.map((row) => row.userId) ?? [];
    const db = await getDb();
    const eligible = and(
      eq(userLocation.locationId, context.shift.locationId),
      eq(userSkill.skillId, context.shift.skillId),
    );

    const assignedRows =
      assignedIds.length === 0
        ? []
        : await db
            .select({
              id: userTable.id,
              name: userTable.name,
              email: userTable.email,
            })
            .from(userTable)
            .where(inArray(userTable.id, assignedIds))
            .orderBy(asc(userTable.name));

    const candidateWhere = and(
      eligible,
      assignedIds.length > 0 ? notInArray(userTable.id, assignedIds) : undefined,
      staffNameSearch(data.q),
    );

    const [candidateRows, totalRow] = await Promise.all([
      db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
        })
        .from(userTable)
        .innerJoin(userLocation, eq(userLocation.userId, userTable.id))
        .innerJoin(userSkill, eq(userSkill.userId, userTable.id))
        .where(candidateWhere)
        .orderBy(asc(userTable.name))
        .limit(SHIFT_ASSIGN_STAFF_LIMIT),
      db
        .select({ total: count() })
        .from(userTable)
        .innerJoin(userLocation, eq(userLocation.userId, userTable.id))
        .innerJoin(userSkill, eq(userSkill.userId, userTable.id))
        .where(candidateWhere),
    ]);

    const constraintUserIds = [
      ...new Set([...assignedRows.map((row) => row.id), ...candidateRows.map((row) => row.id)]),
    ];
    const shiftContext = toAssignShiftContext(context.shift);
    const constraintInputs = await loadConstraintInputs(db, constraintUserIds, shiftContext);
    const { shiftsByUser } = constraintInputs;
    const weekStart = mondayOfWeekContaining(
      context.shift.startsAt,
      context.shift.location.timezone,
    );

    const candidates = candidateRows.map((person) => {
      const result = evaluateForUser(shiftContext, person.id, constraintInputs);
      return {
        ...person,
        assigned: false as const,
        blockers: result.failures
          .filter((issue) => issue.rule !== "consecutive_days")
          .map((issue) => issue.message),
        warnings: result.warnings.map((issue) => issue.message),
        requiresOverride: result.requiresOverride,
        weeklyHoursAfter: result.weeklyHours,
      };
    });

    return {
      assigned: assignedRows.map((person) => ({
        ...person,
        assigned: true as const,
        blockers: [] as string[],
        warnings: [] as string[],
        requiresOverride: false,
        weeklyHoursAfter: clipWeeklyHours(
          [
            ...(shiftsByUser.get(person.id) ?? []),
            { startsAt: context.shift.startsAt, endsAt: context.shift.endsAt },
          ],
          weekStart,
          context.shift.location.timezone,
        ),
      })),
      candidates,
      totalCandidates: totalRow[0]?.total ?? 0,
    };
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

    const shiftId = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(shiftTable).values({
        id: shiftId,
        locationId: location.id,
        skillId: data.skillId,
        startsAt,
        endsAt,
        headcountNeeded: data.headcountNeeded,
        notes: data.notes?.trim() || null,
        createdByUserId: session.user.id,
      });
      await recordScheduleAudit(tx, {
        locationId: location.id,
        shiftId,
        actorUserId: session.user.id,
        action: "create",
        after: await snapshotShift(tx, shiftId),
      });
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
    const moved =
      startsAt.getTime() !== context.shift.startsAt.getTime() ||
      endsAt.getTime() !== context.shift.endsAt.getTime() ||
      data.skillId !== context.shift.skillId;

    await db.transaction(async (tx) => {
      const before = await snapshotShift(tx, data.shiftId);
      const assignedIds = before?.assignees.map((person) => person.userId) ?? [];
      if (assignedIds.length > data.headcountNeeded) {
        throw new Error(
          `${assignedIds.length} people are already on this shift. Remove someone before lowering headcount to ${data.headcountNeeded}.`,
        );
      }
      if (moved) {
        await assertAssigneesStillLegal(tx, {
          shift: {
            ...toAssignShiftContext(context.shift),
            startsAt,
            endsAt,
            skillId: data.skillId,
          },
          userIds: assignedIds,
        });
      }
      await tx
        .update(shiftTable)
        .set({
          skillId: data.skillId,
          startsAt,
          endsAt,
          headcountNeeded: data.headcountNeeded,
          notes: data.notes?.trim() || null,
        })
        .where(eq(shiftTable.id, data.shiftId));
      await cancelActiveCoverageForShift(tx, data.shiftId, session.user.id);
      const after = await snapshotShift(tx, data.shiftId);
      await recordScheduleAudit(tx, {
        locationId: context.shift.locationId,
        shiftId: data.shiftId,
        actorUserId: session.user.id,
        action: "update",
        before,
        after,
      });
      await notifyUsers(tx, after?.assignees.map((person) => person.userId) ?? [], {
        kind: "shift_changed",
        title: "A shift you are on changed",
        body: `${context.shift.location.name}: a manager edited date, time, skill, or notes.`,
      });
    });

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
    await db.transaction(async (tx) => {
      const before = await snapshotShift(tx, data.shiftId);
      await cancelActiveCoverageForShift(tx, data.shiftId, session.user.id);
      await tx.delete(shiftTable).where(eq(shiftTable.id, data.shiftId));
      await recordScheduleAudit(tx, {
        locationId: context.shift.locationId,
        shiftId: data.shiftId,
        actorUserId: session.user.id,
        action: "delete",
        before,
      });
    });
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
    const shiftContext = toAssignShiftContext(context.shift);

    // Fail fast outside the transaction so the message can name alternatives.
    await assertAssignable(db, {
      shift: shiftContext,
      userId: data.userId,
      overrideReason: data.overrideReason,
    });

    await db.transaction(async (tx) => {
      const live = await assertAssignable(
        tx,
        { shift: shiftContext, userId: data.userId, overrideReason: data.overrideReason },
        {
          phase: "commit",
          overlapMessage: "Someone else just assigned this person to an overlapping shift.",
        },
      );
      await assertHeadcountAvailable(tx, shiftContext, context.shift.headcountNeeded);
      await tx.insert(shiftAssignmentTable).values({
        id: crypto.randomUUID(),
        shiftId: data.shiftId,
        userId: data.userId,
        overrideReason: data.overrideReason ?? null,
      });
      await recordScheduleAudit(tx, {
        locationId: context.shift.locationId,
        shiftId: data.shiftId,
        actorUserId: session.user.id,
        action: "assign",
        after: await snapshotShift(tx, data.shiftId),
      });
      await notifyUsers(tx, [data.userId], {
        kind: "shift_assigned",
        title: "You were assigned a shift",
        body: `${context.shift.location.name} · a manager assigned you.`,
      });
      const weekStart = mondayOfWeekContaining(
        context.shift.startsAt,
        context.shift.location.timezone,
      );
      const weekHours = clipWeeklyHours(
        [...live.otherShifts, { startsAt: context.shift.startsAt, endsAt: context.shift.endsAt }],
        weekStart,
        context.shift.location.timezone,
      );
      if (weekHours >= WEEKLY_HOURS_LIMIT) {
        const managers = await loadLocationManagerIds(tx, context.shift.locationId);
        await notifyUsers(tx, managers, {
          kind: "overtime",
          title: "Overtime warning",
          body: `An assignment at ${context.shift.location.name} puts someone over ${WEEKLY_HOURS_LIMIT}h this week.`,
        });
      }
    });

    return { ok: true as const };
  });

export const unassignManagerShiftInputSchema = z.object({
  shiftId: z.string().min(1),
  userId: z.string().min(1),
});

export const unassignManagerShift = createServerFn({ method: "POST" })
  .validator(unassignManagerShiftInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.manager]);
    const context = await getShiftContext(data.shiftId);
    await assertManagerLocationAccess(session.user.id, context.shift.locationId);
    assertCanMutate(context.shift.startsAt, context.published, "change assignments");

    const db = await getDb();
    await db.transaction(async (tx) => {
      const before = await snapshotShift(tx, data.shiftId);
      await tx
        .delete(shiftAssignmentTable)
        .where(
          and(
            eq(shiftAssignmentTable.shiftId, data.shiftId),
            eq(shiftAssignmentTable.userId, data.userId),
          ),
        );
      await recordScheduleAudit(tx, {
        locationId: context.shift.locationId,
        shiftId: data.shiftId,
        actorUserId: session.user.id,
        action: "unassign",
        before,
        after: await snapshotShift(tx, data.shiftId),
      });
    });

    return { ok: true as const };
  });
