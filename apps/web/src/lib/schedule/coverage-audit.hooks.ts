import type { DbSession } from "@/lib/drizzle/client";
import { recordScheduleAudit, snapshotShift } from "@/lib/schedule/audit.server";

export type CoverageAuditEvent = {
  db: DbSession;
  locationId: string;
  shiftId: string;
  actorUserId: string;
  action: string;
  before?: unknown;
  after?: unknown;
};

export type CoverageAuditHook = (event: CoverageAuditEvent) => Promise<void>;

const coverageAuditHooks: CoverageAuditHook[] = [
  async ({ db, locationId, shiftId, actorUserId, action, before, after }) => {
    await recordScheduleAudit(db, {
      locationId,
      shiftId,
      actorUserId,
      action,
      before,
      after,
    });
  },
];

export function registerCoverageAuditHook(hook: CoverageAuditHook) {
  coverageAuditHooks.push(hook);
}

export async function emitCoverageAudit(event: CoverageAuditEvent) {
  for (const hook of coverageAuditHooks) {
    await hook(event);
  }
}

export async function auditCoverageChange(
  db: DbSession,
  input: {
    locationId: string;
    shiftId: string;
    actorUserId: string;
    action: string;
    before?: unknown;
    after?: unknown;
  },
) {
  const shiftSnap = await snapshotShift(db, input.shiftId);
  await emitCoverageAudit({
    db,
    locationId: input.locationId,
    shiftId: input.shiftId,
    actorUserId: input.actorUserId,
    action: input.action,
    before: input.before ?? shiftSnap,
    after: input.after ?? shiftSnap,
  });
}
