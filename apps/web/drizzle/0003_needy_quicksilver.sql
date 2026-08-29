CREATE TABLE `user_availability_exception` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`kind` text NOT NULL,
	`start_minute` integer NOT NULL,
	`end_minute` integer NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_availability_exception_userId_idx` ON `user_availability_exception` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_availability_exception_user_date_kind_start_idx` ON `user_availability_exception` (`user_id`,`date`,`kind`,`start_minute`);