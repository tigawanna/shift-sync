CREATE TABLE `staff_desired_hours` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`week_start_date` text NOT NULL,
	`hours` integer NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_desired_hours_user_week_idx` ON `staff_desired_hours` (`user_id`,`week_start_date`);--> statement-breakpoint
CREATE INDEX `staff_desired_hours_userId_idx` ON `staff_desired_hours` (`user_id`);