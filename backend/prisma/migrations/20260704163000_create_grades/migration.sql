CREATE TABLE `grades` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `enrolment_id` INTEGER NOT NULL,
  `evaluation_id` INTEGER NOT NULL,
  `assessment_scheme_id` INTEGER NOT NULL,
  `grade_status_id` INTEGER NULL,
  `numeric_grade` DECIMAL(4, 2) NULL,
  `final_grade` DECIMAL(4, 2) NULL,
  `is_passed` BOOLEAN NULL,
  `is_locked` BOOLEAN NOT NULL DEFAULT false,
  `remarks` TEXT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  `deleted_at` DATETIME(0) NULL,

  INDEX `grades_enrolment_id_idx`(`enrolment_id`),
  INDEX `grades_evaluation_id_idx`(`evaluation_id`),
  INDEX `grades_assessment_scheme_id_idx`(`assessment_scheme_id`),
  INDEX `grades_grade_status_id_idx`(`grade_status_id`),
  INDEX `grades_final_grade_idx`(`final_grade`),
  INDEX `grades_is_passed_idx`(`is_passed`),
  INDEX `grades_is_locked_idx`(`is_locked`),
  INDEX `grades_deleted_at_idx`(`deleted_at`),
  UNIQUE INDEX `grades_enrolment_evaluation_unique`(`enrolment_id`, `evaluation_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `grade_component_scores` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `grade_id` INTEGER NOT NULL,
  `assessment_component_id` INTEGER NOT NULL,
  `score` DECIMAL(4, 2) NULL,
  `weighted_score` DECIMAL(5, 2) NULL,
  `is_missing` BOOLEAN NOT NULL DEFAULT false,
  `remarks` TEXT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,

  INDEX `grade_component_scores_grade_id_idx`(`grade_id`),
  INDEX `grade_component_scores_assessment_component_id_idx`(`assessment_component_id`),
  INDEX `grade_component_scores_is_missing_idx`(`is_missing`),
  UNIQUE INDEX `grade_component_scores_unique`(`grade_id`, `assessment_component_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `grades`
  ADD CONSTRAINT `grades_enrolment_id_fkey`
  FOREIGN KEY (`enrolment_id`)
  REFERENCES `enrolments`(`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE `grades`
  ADD CONSTRAINT `grades_evaluation_id_fkey`
  FOREIGN KEY (`evaluation_id`)
  REFERENCES `evaluations`(`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE `grades`
  ADD CONSTRAINT `grades_assessment_scheme_id_fkey`
  FOREIGN KEY (`assessment_scheme_id`)
  REFERENCES `assessment_schemes`(`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE `grades`
  ADD CONSTRAINT `grades_grade_status_id_fkey`
  FOREIGN KEY (`grade_status_id`)
  REFERENCES `grade_statuses`(`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE `grade_component_scores`
  ADD CONSTRAINT `grade_component_scores_grade_id_fkey`
  FOREIGN KEY (`grade_id`)
  REFERENCES `grades`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `grade_component_scores`
  ADD CONSTRAINT `grade_component_scores_assessment_component_id_fkey`
  FOREIGN KEY (`assessment_component_id`)
  REFERENCES `assessment_components`(`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
