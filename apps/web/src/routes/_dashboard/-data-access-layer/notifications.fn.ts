import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { appNotification, notificationPreference } from "@/lib/drizzle/schema/notification-schema";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

export const listMyNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const { session } = await requireSessionRoles([ROLE.staff, ROLE.manager, ROLE.admin]);
  const db = await getDb();
  const [items, prefRow] = await Promise.all([
    db
      .select({
        id: appNotification.id,
        kind: appNotification.kind,
        title: appNotification.title,
        body: appNotification.body,
        readAt: appNotification.readAt,
        emailSimulated: appNotification.emailSimulated,
        createdAt: appNotification.createdAt,
      })
      .from(appNotification)
      .where(eq(appNotification.userId, session.user.id))
      .orderBy(desc(appNotification.createdAt))
      .limit(40),
    db
      .select({ emailSimulation: notificationPreference.emailSimulation })
      .from(notificationPreference)
      .where(eq(notificationPreference.userId, session.user.id))
      .limit(1),
  ]);

  return {
    items,
    unreadCount: items.filter((item) => item.readAt === null).length,
    emailSimulation: prefRow[0]?.emailSimulation ?? false,
  };
});

export const markNotificationRead = createServerFn({ method: "POST" })
  .validator(z.object({ notificationId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff, ROLE.manager, ROLE.admin]);
    const db = await getDb();
    await db
      .update(appNotification)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(appNotification.id, data.notificationId),
          eq(appNotification.userId, session.user.id),
        ),
      );
    return { ok: true as const };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" }).handler(async () => {
  const { session } = await requireSessionRoles([ROLE.staff, ROLE.manager, ROLE.admin]);
  const db = await getDb();
  await db
    .update(appNotification)
    .set({ readAt: new Date() })
    .where(and(eq(appNotification.userId, session.user.id), isNull(appNotification.readAt)));
  return { ok: true as const };
});

export const setNotificationPreference = createServerFn({ method: "POST" })
  .validator(z.object({ emailSimulation: z.boolean() }))
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff, ROLE.manager, ROLE.admin]);
    const db = await getDb();
    await db
      .insert(notificationPreference)
      .values({ userId: session.user.id, emailSimulation: data.emailSimulation })
      .onConflictDoUpdate({
        target: notificationPreference.userId,
        set: { emailSimulation: data.emailSimulation },
      });
    return { emailSimulation: data.emailSimulation };
  });
