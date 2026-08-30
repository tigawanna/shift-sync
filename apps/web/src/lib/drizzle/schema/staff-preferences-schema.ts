import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

/** Weekly hour target for a Monday–Sunday week. Independent of availability windows. */
export const staffDesiredHours = sqliteTable(
  "staff_desired_hours",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    weekStartDate: text("week_start_date").notNull(),
    hours: integer("hours").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("staff_desired_hours_user_week_idx").on(table.userId, table.weekStartDate),
    index("staff_desired_hours_userId_idx").on(table.userId),
  ],
);

export const staffDesiredHoursRelations = relations(staffDesiredHours, ({ one }) => ({
  user: one(user, {
    fields: [staffDesiredHours.userId],
    references: [user.id],
  }),
}));
