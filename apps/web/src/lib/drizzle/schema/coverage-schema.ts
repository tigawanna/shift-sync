import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
import { shift } from "./schedule-schema";

/** Staff-initiated swap or drop. Assignment rows do not move until status is approved. */
export const coverageRequest = sqliteTable(
  "coverage_request",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    shiftId: text("shift_id")
      .notNull()
      .references(() => shift.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id").references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
    resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
    resolvedByUserId: text("resolved_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("coverage_request_shiftId_idx").on(table.shiftId),
    index("coverage_request_fromUserId_idx").on(table.fromUserId),
    index("coverage_request_toUserId_idx").on(table.toUserId),
    index("coverage_request_status_idx").on(table.status),
  ],
);

export const coverageRequestRelations = relations(coverageRequest, ({ one }) => ({
  shift: one(shift, {
    fields: [coverageRequest.shiftId],
    references: [shift.id],
  }),
  fromUser: one(user, {
    fields: [coverageRequest.fromUserId],
    references: [user.id],
    relationName: "coverageFromUser",
  }),
  toUser: one(user, {
    fields: [coverageRequest.toUserId],
    references: [user.id],
    relationName: "coverageToUser",
  }),
}));
