CREATE TABLE `coverage_request` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`shift_id` text NOT NULL,
	`from_user_id` text NOT NULL,
	`to_user_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`resolved_at` integer,
	`resolved_by_user_id` text,
	FOREIGN KEY (`shift_id`) REFERENCES `shift`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `coverage_request_shiftId_idx` ON `coverage_request` (`shift_id`);--> statement-breakpoint
CREATE INDEX `coverage_request_fromUserId_idx` ON `coverage_request` (`from_user_id`);--> statement-breakpoint
CREATE INDEX `coverage_request_toUserId_idx` ON `coverage_request` (`to_user_id`);--> statement-breakpoint
CREATE INDEX `coverage_request_status_idx` ON `coverage_request` (`status`);