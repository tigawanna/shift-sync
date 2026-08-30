import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export const notificationPreference = sqliteTable("notification_preference", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  emailSimulation: integer("email_simulation", { mode: "boolean" }).notNull().default(false),
});

export const appNotification = sqliteTable(
  "app_notification",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    emailSimulated: integer("email_simulated", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("app_notification_userId_createdAt_idx").on(table.userId, table.createdAt),
    index("app_notification_userId_readAt_idx").on(table.userId, table.readAt),
  ],
);
