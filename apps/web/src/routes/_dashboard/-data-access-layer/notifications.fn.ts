import { ADMIN_LIST_PER_PAGE } from "@/components/pagination/constants";
import { requireSessionRoles } from "@/data-access-layer/auth/roles";
import { ROLE } from "@/lib/better-auth/roles";
import { getDb } from "@/lib/drizzle/client";
import { appNotification, notificationPreference } from "@/lib/drizzle/schema/notification-schema";
import { createServerFn } from "@tanstack/react-start";
import { and, count, desc, eq, isNull, like, or } from "drizzle-orm";
import { z } from "zod";

export const listMyNotificationsInputSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(ADMIN_LIST_PER_PAGE),
  sq: z.string().optional().default(""),
  unread: z.enum(["all", "unread"]).optional().default("all"),
});

export type ListMyNotificationsInput = z.input<typeof listMyNotificationsInputSchema>;

function notificationSearch(sq: string) {
  const trimmed = sq.trim();
  if (!trimmed) return undefined;
  const pattern = `%${trimmed}%`;
  return or(
    like(appNotification.title, pattern),
    like(appNotification.body, pattern),
    like(appNotification.kind, pattern),
  );
}

export const listMyNotifications = createServerFn({ method: "GET" })
  .validator(listMyNotificationsInputSchema)
  .handler(async ({ data }) => {
    const { session } = await requireSessionRoles([ROLE.staff, ROLE.manager, ROLE.admin]);
    const db = await getDb();
    const page = data.page;
    const perPage = data.perPage;
    const unreadOnly = data.unread === "unread";
    const where = and(
      eq(appNotification.userId, session.user.id),
      unreadOnly ? isNull(appNotification.readAt) : undefined,
      notificationSearch(data.sq),
    );

    const [items, totalRow, unreadRow, prefRow] = await Promise.all([
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
        .where(where)
        .orderBy(desc(appNotification.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage),
      db.select({ total: count() }).from(appNotification).where(where),
      db
        .select({ total: count() })
        .from(appNotification)
        .where(and(eq(appNotification.userId, session.user.id), isNull(appNotification.readAt))),
      db
        .select({ emailSimulation: notificationPreference.emailSimulation })
        .from(notificationPreference)
        .where(eq(notificationPreference.userId, session.user.id))
        .limit(1),
    ]);

    const total = totalRow[0]?.total ?? 0;

    return {
      items,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      unreadCount: unreadRow[0]?.total ?? 0,
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
