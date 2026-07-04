-- CreateTable
CREATE TABLE `academic_years` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(20) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `is_current` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,
    `deleted_at` DATETIME(0) NULL,

    UNIQUE INDEX `academic_years_name_key`(`name`),
    INDEX `academic_years_is_current_idx`(`is_current`),
    INDEX `academic_years_is_active_idx`(`is_active`),
    INDEX `academic_years_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `centres` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `short_name` VARCHAR(100) NULL,
    `tax_id` VARCHAR(20) NULL,
    `address` VARCHAR(255) NULL,
    `postal_code` VARCHAR(10) NULL,
    `city` VARCHAR(100) NULL,
    `province` VARCHAR(100) NULL,
    `phone` VARCHAR(30) NULL,
    `email` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,
    `deleted_at` DATETIME(0) NULL,

    UNIQUE INDEX `centres_code_key`(`code`),
    INDEX `centres_name_idx`(`name`),
    INDEX `centres_city_idx`(`city`),
    INDEX `centres_province_idx`(`province`),
    INDEX `centres_is_active_idx`(`is_active`),
    INDEX `centres_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vocational_programmes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `acronym` VARCHAR(20) NOT NULL,
    `family` VARCHAR(150) NULL,
    `type` ENUM('BASIC', 'INTERMEDIATE', 'HIGHER', 'SPECIALIZATION') NOT NULL DEFAULT 'HIGHER',
    `total_hours` INTEGER NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,
    `deleted_at` DATETIME(0) NULL,

    UNIQUE INDEX `vocational_programmes_code_key`(`code`),
    UNIQUE INDEX `vocational_programmes_acronym_key`(`acronym`),
    INDEX `vocational_programmes_name_idx`(`name`),
    INDEX `vocational_programmes_family_idx`(`family`),
    INDEX `vocational_programmes_type_idx`(`type`),
    INDEX `vocational_programmes_is_active_idx`(`is_active`),
    INDEX `vocational_programmes_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `centre_programmes` (
    `centre_id` INTEGER NOT NULL,
    `vocational_programme_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,
    `deleted_at` DATETIME(0) NULL,

    INDEX `centre_programmes_vocational_programme_id_idx`(`vocational_programme_id`),
    INDEX `centre_programmes_is_active_idx`(`is_active`),
    INDEX `centre_programmes_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`centre_id`, `vocational_programme_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `academic_levels` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `number` INTEGER NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,
    `deleted_at` DATETIME(0) NULL,

    UNIQUE INDEX `academic_levels_number_key`(`number`),
    UNIQUE INDEX `academic_levels_name_key`(`name`),
    INDEX `academic_levels_is_active_idx`(`is_active`),
    INDEX `academic_levels_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `academic_offerings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `academic_year_id` INTEGER NOT NULL,
    `centre_id` INTEGER NOT NULL,
    `vocational_programme_id` INTEGER NOT NULL,
    `academic_level_id` INTEGER NOT NULL,
    `modality` ENUM('PRESENTIAL', 'ONLINE', 'BLENDED') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,
    `deleted_at` DATETIME(0) NULL,

    INDEX `academic_offerings_academic_year_id_idx`(`academic_year_id`),
    INDEX `academic_offerings_centre_id_vocational_programme_id_idx`(`centre_id`, `vocational_programme_id`),
    INDEX `academic_offerings_academic_level_id_idx`(`academic_level_id`),
    INDEX `academic_offerings_modality_idx`(`modality`),
    INDEX `academic_offerings_is_active_idx`(`is_active`),
    INDEX `academic_offerings_deleted_at_idx`(`deleted_at`),
    UNIQUE INDEX `academic_offerings_scope_unique`(`academic_year_id`, `centre_id`, `vocational_programme_id`, `academic_level_id`, `modality`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vocational_programme_id` INTEGER NOT NULL,
    `academic_level_id` INTEGER NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `acronym` VARCHAR(30) NULL,
    `total_hours` INTEGER NULL,
    `weekly_hours` DECIMAL(4, 2) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,
    `deleted_at` DATETIME(0) NULL,

    INDEX `modules_vocational_programme_id_idx`(`vocational_programme_id`),
    INDEX `modules_academic_level_id_idx`(`academic_level_id`),
    INDEX `modules_name_idx`(`name`),
    INDEX `modules_sort_order_idx`(`sort_order`),
    INDEX `modules_is_active_idx`(`is_active`),
    INDEX `modules_deleted_at_idx`(`deleted_at`),
    UNIQUE INDEX `modules_programme_code_unique`(`vocational_programme_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `centre_programmes` ADD CONSTRAINT `centre_programmes_centre_id_fkey` FOREIGN KEY (`centre_id`) REFERENCES `centres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `centre_programmes` ADD CONSTRAINT `centre_programmes_vocational_programme_id_fkey` FOREIGN KEY (`vocational_programme_id`) REFERENCES `vocational_programmes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_offerings` ADD CONSTRAINT `academic_offerings_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_offerings` ADD CONSTRAINT `academic_offerings_centre_id_vocational_programme_id_fkey` FOREIGN KEY (`centre_id`, `vocational_programme_id`) REFERENCES `centre_programmes`(`centre_id`, `vocational_programme_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_offerings` ADD CONSTRAINT `academic_offerings_academic_level_id_fkey` FOREIGN KEY (`academic_level_id`) REFERENCES `academic_levels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `modules` ADD CONSTRAINT `modules_vocational_programme_id_fkey` FOREIGN KEY (`vocational_programme_id`) REFERENCES `vocational_programmes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `modules` ADD CONSTRAINT `modules_academic_level_id_fkey` FOREIGN KEY (`academic_level_id`) REFERENCES `academic_levels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
