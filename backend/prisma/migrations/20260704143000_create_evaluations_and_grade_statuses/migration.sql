CREATE TABLE `evaluations` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `academic_year_id` INTEGER NOT NULL,
  `centre_id` INTEGER NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `sequence` INTEGER NOT NULL DEFAULT 0,
  `starts_at` DATE NULL,
  `ends_at` DATE NULL,
  `status` ENUM('DRAFT', 'OPEN', 'CLOSED', 'LOCKED') NOT NULL DEFAULT 'DRAFT',
  `closed_at` DATETIME(0) NULL,
  `remarks` TEXT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `deleted_at` DATETIME(0) NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `evaluations_scope_code_unique` ON `evaluations` (`academic_year_id`, `centre_id`, `code`);
CREATE INDEX `evaluations_academic_year_id_idx` ON `evaluations` (`academic_year_id`);
CREATE INDEX `evaluations_centre_id_idx` ON `evaluations` (`centre_id`);
CREATE INDEX `evaluations_status_idx` ON `evaluations` (`status`);
CREATE INDEX `evaluations_sequence_idx` ON `evaluations` (`sequence`);
CREATE INDEX `evaluations_starts_at_idx` ON `evaluations` (`starts_at`);
CREATE INDEX `evaluations_ends_at_idx` ON `evaluations` (`ends_at`);
CREATE INDEX `evaluations_deleted_at_idx` ON `evaluations` (`deleted_at`);

ALTER TABLE `evaluations` ADD CONSTRAINT `evaluations_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `evaluations` ADD CONSTRAINT `evaluations_centre_id_fkey` FOREIGN KEY (`centre_id`) REFERENCES `centres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `grade_statuses` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `is_evaluable` BOOLEAN NOT NULL DEFAULT false,
  `counts_as_passed` BOOLEAN NOT NULL DEFAULT false,
  `counts_as_no_show` BOOLEAN NOT NULL DEFAULT false,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `deleted_at` DATETIME(0) NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `grade_statuses_code_key` ON `grade_statuses` (`code`);
CREATE INDEX `grade_statuses_sort_order_idx` ON `grade_statuses` (`sort_order`);
CREATE INDEX `grade_statuses_is_active_idx` ON `grade_statuses` (`is_active`);
CREATE INDEX `grade_statuses_deleted_at_idx` ON `grade_statuses` (`deleted_at`);
