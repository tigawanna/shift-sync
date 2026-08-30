CREATE TABLE `app_notification` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`read_at` integer,
	`email_simulated` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `app_notification_userId_createdAt_idx` ON `app_notification` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `app_notification_userId_readAt_idx` ON `app_notification` (`user_id`,`read_at`);--> statement-breakpoint
CREATE TABLE `notification_preference` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email_simulation` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
