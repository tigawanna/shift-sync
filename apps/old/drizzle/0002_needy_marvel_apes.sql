CREATE TABLE `skill` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_availability` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`weekday` integer NOT NULL,
	`start_minute` integer NOT NULL,
	`end_minute` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_availability_userId_idx` ON `user_availability` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_availability_user_weekday_start_idx` ON `user_availability` (`user_id`,`weekday`,`start_minute`);--> statement-breakpoint
CREATE TABLE `user_skill` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skill`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_skill_user_skill_idx` ON `user_skill` (`user_id`,`skill_id`);--> statement-breakpoint
CREATE INDEX `user_skill_userId_idx` ON `user_skill` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_skill_skillId_idx` ON `user_skill` (`skill_id`);--> statement-breakpoint
CREATE TABLE `schedule_week` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`week_start_date` text NOT NULL,
	`published_at` integer NOT NULL,
	`published_by_user_id` text NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `location`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`published_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `schedule_week_location_week_idx` ON `schedule_week` (`location_id`,`week_start_date`);--> statement-breakpoint
CREATE INDEX `schedule_week_locationId_idx` ON `schedule_week` (`location_id`);--> statement-breakpoint
CREATE TABLE `shift` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`headcount_needed` integer NOT NULL,
	`notes` text,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `location`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skill`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `shift_locationId_startsAt_idx` ON `shift` (`location_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `shift_startsAt_idx` ON `shift` (`starts_at`);--> statement-breakpoint
CREATE TABLE `shift_assignment` (
	`id` text PRIMARY KEY NOT NULL,
	`shift_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`shift_id`) REFERENCES `shift`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shift_assignment_shift_user_idx` ON `shift_assignment` (`shift_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `shift_assignment_userId_idx` ON `shift_assignment` (`user_id`);--> statement-breakpoint
CREATE INDEX `shift_assignment_shiftId_idx` ON `shift_assignment` (`shift_id`);