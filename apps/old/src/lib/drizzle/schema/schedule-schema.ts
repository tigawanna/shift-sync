import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
import { location } from "./locations-schema";
import { skill } from "./skills-schema";

export const shift = sqliteTable(
  "shift",
  {
    id: text("id").primaryKey(),
    locationId: text("location_id")
      .notNull()
      .references(() => location.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skill.id, { onDelete: "restrict" }),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
    headcountNeeded: integer("headcount_needed").notNull(),
    notes: text("notes"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("shift_locationId_startsAt_idx").on(table.locationId, table.startsAt),
    index("shift_startsAt_idx").on(table.startsAt),
  ],
);

export const shiftAssignment = sqliteTable(
  "shift_assignment",
  {
    id: text("id").primaryKey(),
    shiftId: text("shift_id")
      .notNull()
      .references(() => shift.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("shift_assignment_shift_user_idx").on(table.shiftId, table.userId),
    index("shift_assignment_userId_idx").on(table.userId),
    index("shift_assignment_shiftId_idx").on(table.shiftId),
  ],
);

/** Published week for a location. `weekStartDate` is Monday YYYY-MM-DD in that location's timezone. */
export const scheduleWeek = sqliteTable(
  "schedule_week",
  {
    id: text("id").primaryKey(),
    locationId: text("location_id")
      .notNull()
      .references(() => location.id, { onDelete: "cascade" }),
    weekStartDate: text("week_start_date").notNull(),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
    publishedByUserId: text("published_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("schedule_week_location_week_idx").on(table.locationId, table.weekStartDate),
    index("schedule_week_locationId_idx").on(table.locationId),
  ],
);

export const shiftRelations = relations(shift, ({ one, many }) => ({
  location: one(location, {
    fields: [shift.locationId],
    references: [location.id],
  }),
  skill: one(skill, {
    fields: [shift.skillId],
    references: [skill.id],
  }),
  createdBy: one(user, {
    fields: [shift.createdByUserId],
    references: [user.id],
  }),
  assignments: many(shiftAssignment),
}));

export const shiftAssignmentRelations = relations(shiftAssignment, ({ one }) => ({
  shift: one(shift, {
    fields: [shiftAssignment.shiftId],
    references: [shift.id],
  }),
  user: one(user, {
    fields: [shiftAssignment.userId],
    references: [user.id],
  }),
}));

export const scheduleWeekRelations = relations(scheduleWeek, ({ one }) => ({
  location: one(location, {
    fields: [scheduleWeek.locationId],
    references: [location.id],
  }),
  publishedBy: one(user, {
    fields: [scheduleWeek.publishedByUserId],
    references: [user.id],
  }),
}));
