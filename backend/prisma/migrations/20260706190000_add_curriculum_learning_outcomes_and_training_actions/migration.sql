CREATE TABLE IF NOT EXISTS module_learning_outcomes (
  id INT NOT NULL AUTO_INCREMENT,
  module_id INT NOT NULL,
  code VARCHAR(50) NOT NULL,
  title VARCHAR(191) NOT NULL,
  description TEXT NULL,
  source_reference VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY module_learning_outcomes_module_code_unique (module_id, code),
  KEY module_learning_outcomes_module_idx (module_id),
  KEY module_learning_outcomes_code_idx (code),
  KEY module_learning_outcomes_sort_idx (sort_order),
  KEY module_learning_outcomes_active_idx (is_active),
  KEY module_learning_outcomes_deleted_idx (deleted_at),
  CONSTRAINT module_learning_outcomes_module_fk
    FOREIGN KEY (module_id)
    REFERENCES modules (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS module_training_actions (
  id INT NOT NULL AUTO_INCREMENT,
  module_id INT NOT NULL,
  code VARCHAR(50) NOT NULL,
  title VARCHAR(191) NOT NULL,
  description TEXT NULL,
  planned_hours DECIMAL(6, 2) NULL,
  source_reference VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY module_training_actions_module_code_unique (module_id, code),
  KEY module_training_actions_module_idx (module_id),
  KEY module_training_actions_code_idx (code),
  KEY module_training_actions_sort_idx (sort_order),
  KEY module_training_actions_active_idx (is_active),
  KEY module_training_actions_deleted_idx (deleted_at),
  CONSTRAINT module_training_actions_module_fk
    FOREIGN KEY (module_id)
    REFERENCES modules (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS module_training_action_learning_outcomes (
  training_action_id INT NOT NULL,
  learning_outcome_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (training_action_id, learning_outcome_id),
  KEY module_training_action_learning_outcomes_outcome_idx (learning_outcome_id),
  CONSTRAINT module_training_action_learning_outcomes_action_fk
    FOREIGN KEY (training_action_id)
    REFERENCES module_training_actions (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT module_training_action_learning_outcomes_outcome_fk
    FOREIGN KEY (learning_outcome_id)
    REFERENCES module_learning_outcomes (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
