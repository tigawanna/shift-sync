import type { DbSession } from "@/lib/drizzle/client";
import { user as userTable } from "@/lib/drizzle/schema/auth-schema";
import { scheduleAuditLog } from "@/lib/drizzle/schema/audit-schema";
import {
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import { eq } from "drizzle-orm";

export async function snapshotShift(db: DbSession, shiftId: string) {
  const [shift] = await db
    .select({
      id: shiftTable.id,
      locationId: shiftTable.locationId,
      skillId: shiftTable.skillId,
      startsAt: shiftTable.startsAt,
      endsAt: shiftTable.endsAt,
      headcountNeeded: shiftTable.headcountNeeded,
      notes: shiftTable.notes,
    })
    .from(shiftTable)
    .where(eq(shiftTable.id, shiftId))
    .limit(1);

  if (!shift) return null;

  const assignees = await db
    .select({
      userId: userTable.id,
      name: userTable.name,
    })
    .from(shiftAssignmentTable)
    .innerJoin(userTable, eq(userTable.id, shiftAssignmentTable.userId))
    .where(eq(shiftAssignmentTable.shiftId, shiftId));

  return {
    id: shift.id,
    locationId: shift.locationId,
    skillId: shift.skillId,
    startsAt: shift.startsAt.toISOString(),
    endsAt: shift.endsAt.toISOString(),
    headcountNeeded: shift.headcountNeeded,
    notes: shift.notes,
    assignees,
  };
}

export async function recordScheduleAudit(
  db: Pick<DbSession, "insert">,
  input: {
    locationId: string;
    shiftId?: string | null;
    actorUserId: string;
    action: string;
    before?: unknown;
    after?: unknown;
  },
) {
  await db.insert(scheduleAuditLog).values({
    id: crypto.randomUUID(),
    locationId: input.locationId,
    shiftId: input.shiftId ?? null,
    actorUserId: input.actorUserId,
    action: input.action,
    beforeJson: input.before === undefined ? null : JSON.stringify(input.before),
    afterJson: input.after === undefined ? null : JSON.stringify(input.after),
  });
}
