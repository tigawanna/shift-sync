import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
import { location } from "./locations-schema";

/** Schedule write trail. `shift_id` is not a FK so deleting a shift keeps history. */
export const scheduleAuditLog = sqliteTable(
  "schedule_audit_log",
  {
    id: text("id").primaryKey(),
    locationId: text("location_id")
      .notNull()
      .references(() => location.id, { onDelete: "cascade" }),
    shiftId: text("shift_id"),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("schedule_audit_log_locationId_createdAt_idx").on(table.locationId, table.createdAt),
    index("schedule_audit_log_shiftId_idx").on(table.shiftId),
    index("schedule_audit_log_createdAt_idx").on(table.createdAt),
  ],
);
