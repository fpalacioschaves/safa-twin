-- CreateTable
CREATE TABLE `enrolments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `academic_year_id` INTEGER NOT NULL,
    `centre_id` INTEGER NOT NULL,
    `module_id` INTEGER NOT NULL,
    `status` ENUM('ENROLLED', 'WITHDRAWN', 'CONVALIDATED', 'EXEMPT', 'PENDING', 'COMPLETED') NOT NULL DEFAULT 'ENROLLED',
    `enrolled_at` DATE NOT NULL,
    `cancelled_at` DATE NULL,
    `remarks` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,
    `deleted_at` DATETIME(0) NULL,

    UNIQUE INDEX `enrolments_student_year_centre_module_unique`(`student_id`, `academic_year_id`, `centre_id`, `module_id`),
    INDEX `enrolments_student_id_idx`(`student_id`),
    INDEX `enrolments_academic_year_id_idx`(`academic_year_id`),
    INDEX `enrolments_centre_id_idx`(`centre_id`),
    INDEX `enrolments_module_id_idx`(`module_id`),
    INDEX `enrolments_status_idx`(`status`),
    INDEX `enrolments_enrolled_at_idx`(`enrolled_at`),
    INDEX `enrolments_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `enrolments`
ADD CONSTRAINT `enrolments_student_id_fkey`
FOREIGN KEY (`student_id`) REFERENCES `students`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrolments`
ADD CONSTRAINT `enrolments_academic_year_id_fkey`
FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrolments`
ADD CONSTRAINT `enrolments_centre_id_fkey`
FOREIGN KEY (`centre_id`) REFERENCES `centres`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrolments`
ADD CONSTRAINT `enrolments_module_id_fkey`
FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE;
