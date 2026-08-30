import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { appNotification } from "@/lib/drizzle/schema/notification-schema";
import { coverageRequest } from "@/lib/drizzle/schema/coverage-schema";
import {
  scheduleWeek as scheduleWeekTable,
  shift as shiftTable,
  shiftAssignment as shiftAssignmentTable,
} from "@/lib/drizzle/schema/schedule-schema";
import { createServerFn } from "@tanstack/react-start";
import { and, count, eq, isNull, max } from "drizzle-orm";

const stamp = (value: Date | null) => value?.getTime() ?? 0;

/**
 * Four aggregates that stand in for "did anything I can see change?". Cheap
 * enough to poll every few seconds, which lets the heavy schedule and coverage
 * queries sit on a long interval and refetch only when this version moves.
 *
 * Deliberately org-wide rather than scoped: an unrelated location's write costs
 * a viewer one extra refetch, and the refetched query is still scoped to them.
 */
export const getLivePulse = createServerFn({ method: "GET" }).handler(async () => {
  const { session } = await requireSessionRoles([ROLE.staff, ROLE.manager, ROLE.admin]);
  const db = await getDb();

  const [shifts, assignments, coverage, publications, unread] = await Promise.all([
    db.select({ at: max(shiftTable.updatedAt) }).from(shiftTable),
    db.select({ at: max(shiftAssignmentTable.createdAt) }).from(shiftAssignmentTable),
    db.select({ at: max(coverageRequest.updatedAt) }).from(coverageRequest),
    db.select({ at: max(scheduleWeekTable.publishedAt) }).from(scheduleWeekTable),
    db
      .select({ total: count() })
      .from(appNotification)
      .where(and(eq(appNotification.userId, session.user.id), isNull(appNotification.readAt))),
  ]);

  const unreadCount = unread[0]?.total ?? 0;

  return {
    version: [
      stamp(shifts[0]?.at ?? null),
      stamp(assignments[0]?.at ?? null),
      stamp(coverage[0]?.at ?? null),
      stamp(publications[0]?.at ?? null),
      unreadCount,
    ].join("."),
    unreadCount,
  };
});
