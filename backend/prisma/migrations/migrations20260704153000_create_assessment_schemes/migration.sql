CREATE TABLE `assessment_schemes` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `academic_year_id` INTEGER NOT NULL,
  `centre_id` INTEGER NOT NULL,
  `module_id` INTEGER NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `is_dual` BOOLEAN NOT NULL DEFAULT false,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `remarks` TEXT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  `deleted_at` DATETIME(0) NULL,

  INDEX `assessment_schemes_academic_year_id_idx`(`academic_year_id`),
  INDEX `assessment_schemes_centre_id_idx`(`centre_id`),
  INDEX `assessment_schemes_module_id_idx`(`module_id`),
  INDEX `assessment_schemes_is_dual_idx`(`is_dual`),
  INDEX `assessment_schemes_is_active_idx`(`is_active`),
  INDEX `assessment_schemes_deleted_at_idx`(`deleted_at`),
  UNIQUE INDEX `assessment_schemes_scope_unique`(`academic_year_id`, `centre_id`, `module_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `assessment_components` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `assessment_scheme_id` INTEGER NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `type` ENUM('ACTIVITIES', 'SELF_ASSESSMENTS', 'FORUMS', 'COMPANY', 'OTHER') NOT NULL DEFAULT 'OTHER',
  `percentage` DECIMAL(5, 2) NOT NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `is_required` BOOLEAN NOT NULL DEFAULT true,
  `is_company_component` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,

  INDEX `assessment_components_assessment_scheme_id_idx`(`assessment_scheme_id`),
  INDEX `assessment_components_type_idx`(`type`),
  INDEX `assessment_components_sort_order_idx`(`sort_order`),
  UNIQUE INDEX `assessment_components_scheme_code_unique`(`assessment_scheme_id`, `code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `assessment_schemes`
  ADD CONSTRAINT `assessment_schemes_academic_year_id_fkey`
  FOREIGN KEY (`academic_year_id`)
  REFERENCES `academic_years`(`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE `assessment_schemes`
  ADD CONSTRAINT `assessment_schemes_centre_id_fkey`
  FOREIGN KEY (`centre_id`)
  REFERENCES `centres`(`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE `assessment_schemes`
  ADD CONSTRAINT `assessment_schemes_module_id_fkey`
  FOREIGN KEY (`module_id`)
  REFERENCES `modules`(`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE `assessment_components`
  ADD CONSTRAINT `assessment_components_assessment_scheme_id_fkey`
  FOREIGN KEY (`assessment_scheme_id`)
  REFERENCES `assessment_schemes`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
