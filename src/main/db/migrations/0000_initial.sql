CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plasmid_id` integer NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`data` blob NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plasmid_id`) REFERENCES `plasmids`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cassette_parts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cassette_id` integer NOT NULL,
	`feature_id` integer,
	`source_organism_id` integer,
	`order` integer DEFAULT 0 NOT NULL,
	`notes` text,
	FOREIGN KEY (`cassette_id`) REFERENCES `cassettes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_organism_id`) REFERENCES `organisms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cassettes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plasmid_id` integer NOT NULL,
	`name` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plasmid_id`) REFERENCES `plasmids`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `features` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`type` text NOT NULL,
	`organism_source` text,
	`risk_level` integer DEFAULT 0 NOT NULL,
	`uid` text,
	`synced` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `features_uid_unique` ON `features` (`uid`);--> statement-breakpoint
CREATE TABLE `gmos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`plasmid_id` integer,
	`host_organism_id` integer,
	`risk_group` integer,
	`approval` text,
	`created_date` integer,
	`destroyed_date` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plasmid_id`) REFERENCES `plasmids`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`host_organism_id`) REFERENCES `organisms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `organisms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`risk_group` integer DEFAULT 1 NOT NULL,
	`role_group` text,
	`uid` text,
	`synced` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organisms_uid_unique` ON `organisms` (`uid`);--> statement-breakpoint
CREATE TABLE `plasmids` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`description` text,
	`purpose` text,
	`backbone_vector` text,
	`marker` text,
	`target_rg` integer,
	`cloned_by` text,
	`concentration` real,
	`date_created` integer,
	`date_sequenced` integer,
	`sequencing_result` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`creator_name` text DEFAULT '' NOT NULL,
	`creator_initials` text DEFAULT '' NOT NULL,
	`genbank_data` text,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `seeds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`species` text NOT NULL,
	`line_accession` text,
	`source` text,
	`storage_location` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`user_name` text DEFAULT '' NOT NULL,
	`user_initials` text DEFAULT '' NOT NULL,
	`institution` text DEFAULT '' NOT NULL,
	`institution_az` text DEFAULT '' NOT NULL,
	`institution_anlage` text DEFAULT '' NOT NULL,
	`theme` text DEFAULT 'light' NOT NULL,
	`font_size` integer DEFAULT 14 NOT NULL,
	`cloud_provider` text,
	`cloud_path` text,
	`accent_color` text DEFAULT 'teal' NOT NULL,
	`label_template_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
