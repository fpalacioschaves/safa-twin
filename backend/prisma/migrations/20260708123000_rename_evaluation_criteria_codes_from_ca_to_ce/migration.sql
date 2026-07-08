UPDATE module_evaluation_criteria
SET code = CONCAT('CE', SUBSTRING(code, 3))
WHERE code REGEXP '^CA[A-Z]$';
