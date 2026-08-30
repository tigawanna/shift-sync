CREATE TABLE `schedule_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`shift_id` text,
	`actor_user_id` text NOT NULL,
	`action` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `location`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `schedule_audit_log_locationId_createdAt_idx` ON `schedule_audit_log` (`location_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `schedule_audit_log_shiftId_idx` ON `schedule_audit_log` (`shift_id`);--> statement-breakpoint
CREATE INDEX `schedule_audit_log_createdAt_idx` ON `schedule_audit_log` (`created_at`);