CREATE TABLE `attendance_records` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `student_id` INT NOT NULL,
  `academic_year_id` INT NOT NULL,
  `centre_id` INT NOT NULL,
  `module_id` INT NOT NULL,
  `created_by_user_id` INT NULL,
  `recorded_at` DATE NOT NULL,
  `type` ENUM('ABSENCE', 'DELAY', 'EARLY_DEPARTURE') NOT NULL DEFAULT 'ABSENCE',
  `minutes` INT NULL,
  `is_justified` BOOLEAN NOT NULL DEFAULT FALSE,
  `session_label` VARCHAR(100) NULL,
  `remarks` TEXT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  `deleted_at` DATETIME(0) NULL,
  PRIMARY KEY (`id`),
  INDEX `attendance_records_student_idx` (`student_id`),
  INDEX `attendance_records_academic_year_idx` (`academic_year_id`),
  INDEX `attendance_records_centre_idx` (`centre_id`),
  INDEX `attendance_records_module_idx` (`module_id`),
  INDEX `attendance_records_created_by_user_idx` (`created_by_user_id`),
  INDEX `attendance_records_recorded_at_idx` (`recorded_at`),
  INDEX `attendance_records_type_idx` (`type`),
  INDEX `attendance_records_is_justified_idx` (`is_justified`),
  INDEX `attendance_records_deleted_at_idx` (`deleted_at`),
  CONSTRAINT `attendance_records_student_fk`
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `attendance_records_academic_year_fk`
    FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `attendance_records_centre_fk`
    FOREIGN KEY (`centre_id`) REFERENCES `centres` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `attendance_records_module_fk`
    FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `attendance_records_created_by_user_fk`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `attendance_records_minutes_check`
    CHECK (`minutes` IS NULL OR `minutes` > 0)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `incidents` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `student_id` INT NOT NULL,
  `academic_year_id` INT NOT NULL,
  `centre_id` INT NOT NULL,
  `module_id` INT NULL,
  `created_by_user_id` INT NULL,
  `type` ENUM('ACADEMIC', 'BEHAVIOUR', 'DISCIPLINARY', 'TECHNICAL', 'COMPANY_RELATED', 'OTHER') NOT NULL DEFAULT 'OTHER',
  `severity` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
  `occurred_at` DATETIME(0) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `resolution` TEXT NULL,
  `resolved_at` DATETIME(0) NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  `deleted_at` DATETIME(0) NULL,
  PRIMARY KEY (`id`),
  INDEX `incidents_student_idx` (`student_id`),
  INDEX `incidents_academic_year_idx` (`academic_year_id`),
  INDEX `incidents_centre_idx` (`centre_id`),
  INDEX `incidents_module_idx` (`module_id`),
  INDEX `incidents_created_by_user_idx` (`created_by_user_id`),
  INDEX `incidents_type_idx` (`type`),
  INDEX `incidents_severity_idx` (`severity`),
  INDEX `incidents_occurred_at_idx` (`occurred_at`),
  INDEX `incidents_resolved_at_idx` (`resolved_at`),
  INDEX `incidents_deleted_at_idx` (`deleted_at`),
  CONSTRAINT `incidents_student_fk`
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `incidents_academic_year_fk`
    FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `incidents_centre_fk`
    FOREIGN KEY (`centre_id`) REFERENCES `centres` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `incidents_module_fk`
    FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `incidents_created_by_user_fk`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
