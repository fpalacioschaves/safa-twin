CREATE TABLE IF NOT EXISTS module_evaluation_criteria (
  id INT NOT NULL AUTO_INCREMENT,
  learning_outcome_id INT NOT NULL,
  code VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  source_reference VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY module_evaluation_criteria_outcome_code_unique (learning_outcome_id, code),
  KEY module_evaluation_criteria_outcome_idx (learning_outcome_id),
  KEY module_evaluation_criteria_code_idx (code),
  KEY module_evaluation_criteria_sort_idx (sort_order),
  KEY module_evaluation_criteria_active_idx (is_active),
  KEY module_evaluation_criteria_deleted_idx (deleted_at),
  CONSTRAINT module_evaluation_criteria_outcome_fk
    FOREIGN KEY (learning_outcome_id)
    REFERENCES module_learning_outcomes (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
