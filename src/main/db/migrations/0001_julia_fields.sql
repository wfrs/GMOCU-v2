CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `selection_values` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`value` text NOT NULL,
	`label` text NOT NULL,
	`colour` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `selection_values_value_unique` ON `selection_values` (`value`);
--> statement-breakpoint
INSERT OR IGNORE INTO `selection_values` (`value`, `label`, `colour`, `sort_order`) VALUES ('planned', 'Planned', '#868e96', 0);
--> statement-breakpoint
INSERT OR IGNORE INTO `selection_values` (`value`, `label`, `colour`, `sort_order`) VALUES ('in_progress', 'In Progress', '#fab005', 1);
--> statement-breakpoint
INSERT OR IGNORE INTO `selection_values` (`value`, `label`, `colour`, `sort_order`) VALUES ('complete', 'Complete', '#40c057', 2);
--> statement-breakpoint
INSERT OR IGNORE INTO `selection_values` (`value`, `label`, `colour`, `sort_order`) VALUES ('trouble', 'Trouble in Paradise', '#fa5252', 3);
--> statement-breakpoint
INSERT OR IGNORE INTO `selection_values` (`value`, `label`, `colour`, `sort_order`) VALUES ('abandoned', 'Abandoned', '#495057', 4);
--> statement-breakpoint
ALTER TABLE `settings` ADD COLUMN `alias_format` text;
--> statement-breakpoint
ALTER TABLE `settings` ADD COLUMN `auto_create_gmo_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `settings` ADD COLUMN `auto_create_gmo_organism` text;
--> statement-breakpoint
ALTER TABLE `settings` ADD COLUMN `auto_create_gmo_strain` text;
--> statement-breakpoint
ALTER TABLE `settings` ADD COLUMN `status_colours` text;
--> statement-breakpoint
ALTER TABLE `settings` ADD COLUMN `favourite_organisms` text;
--> statement-breakpoint
ALTER TABLE `settings` ADD COLUMN `target_organisms` text;
--> statement-breakpoint
ALTER TABLE `plasmids` ADD COLUMN `category_id` integer;
--> statement-breakpoint
ALTER TABLE `plasmids` ADD COLUMN `cassette` text;
--> statement-breakpoint
ALTER TABLE `plasmids` ADD COLUMN `date_miniprep` integer;
--> statement-breakpoint
ALTER TABLE `plasmids` ADD COLUMN `sequenced` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `plasmids` ADD COLUMN `seq_method` text;
--> statement-breakpoint
ALTER TABLE `plasmids` ADD COLUMN `glycerol_stock_id` text;
--> statement-breakpoint
ALTER TABLE `plasmids` ADD COLUMN `date_glycerol_stock` integer;
--> statement-breakpoint
ALTER TABLE `plasmids` ADD COLUMN `box` text;
--> statement-breakpoint
ALTER TABLE `plasmids` ADD COLUMN `public_comment` text;
--> statement-breakpoint
ALTER TABLE `plasmids` ADD COLUMN `private_comment` text;
--> statement-breakpoint
ALTER TABLE `plasmids` ADD COLUMN `gb_file_path` text;
--> statement-breakpoint
UPDATE `plasmids` SET `status` = 'planned' WHERE `status` = 'draft';
--> statement-breakpoint
UPDATE `plasmids` SET `status` = 'complete' WHERE `status` = 'finished';
--> statement-breakpoint
UPDATE `plasmids` SET `status` = 'abandoned' WHERE `status` = 'archived';
--> statement-breakpoint
CREATE TABLE `gmos_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plasmid_id` integer REFERENCES `plasmids`(`id`),
	`host_organism_id` integer REFERENCES `organisms`(`id`),
	`strain` text,
	`approval` text,
	`created_date` integer,
	`destroyed_date` integer,
	`glycerol_stock_id` text,
	`date_glycerol_stock` integer,
	`box` text,
	`notes` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `gmos_new` SELECT `id`, `plasmid_id`, `host_organism_id`, null, `approval`, `created_date`, `destroyed_date`, null, null, null, `notes`, `created_at` FROM `gmos`;
--> statement-breakpoint
DROP TABLE `gmos`;
--> statement-breakpoint
ALTER TABLE `gmos_new` RENAME TO `gmos`;
--> statement-breakpoint
CREATE TABLE `attachments_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plasmid_id` integer NOT NULL REFERENCES `plasmids`(`id`) ON DELETE CASCADE,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_path` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
DROP TABLE `attachments`;
--> statement-breakpoint
ALTER TABLE `attachments_new` RENAME TO `attachments`;
