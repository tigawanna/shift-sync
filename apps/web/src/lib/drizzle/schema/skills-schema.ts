import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export const skill = sqliteTable("skill", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const userSkill = sqliteTable(
  "user_skill",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skill.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_skill_user_skill_idx").on(table.userId, table.skillId),
    index("user_skill_userId_idx").on(table.userId),
    index("user_skill_skillId_idx").on(table.skillId),
  ],
);

/** Recurring weekly availability as wall-clock minutes (0–1440). No timezone — checked against the shift location clock. */
export const userAvailability = sqliteTable(
  "user_availability",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
  },
  (table) => [
    index("user_availability_userId_idx").on(table.userId),
    uniqueIndex("user_availability_user_weekday_start_idx").on(
      table.userId,
      table.weekday,
      table.startMinute,
    ),
  ],
);

export const skillRelations = relations(skill, ({ many }) => ({
  userSkills: many(userSkill),
}));

export const userSkillRelations = relations(userSkill, ({ one }) => ({
  user: one(user, {
    fields: [userSkill.userId],
    references: [user.id],
  }),
  skill: one(skill, {
    fields: [userSkill.skillId],
    references: [skill.id],
  }),
}));

export const userAvailabilityRelations = relations(userAvailability, ({ one }) => ({
  user: one(user, {
    fields: [userAvailability.userId],
    references: [user.id],
  }),
}));
