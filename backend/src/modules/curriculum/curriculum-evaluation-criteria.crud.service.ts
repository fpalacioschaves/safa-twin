import { prisma } from '../../config/database.js';

import type {
  CurriculumEvaluationCriterionItem,
} from './curriculum.service.js';

import type {
  EvaluationCriterionMutationInput,
} from './curriculum.schemas.js';

interface EvaluationCriterionDetailRow {
  id: bigint | number;
  learning_outcome_id: bigint | number;
  learning_outcome_code: string;
  learning_outcome_title: string;
  module_id: bigint | number;
  module_code: string;
  module_name: string;
  vocational_programme_id: bigint | number;
  vocational_programme_acronym: string;
  vocational_programme_name: string;
  academic_level_id: bigint | number;
  academic_level_number: bigint | number;
  academic_level_name: string;
  code: string;
  title: string;
  description: string | null;
  source_reference: string | null;
  sort_order: bigint | number;
  is_active: boolean | bigint | number;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
}

interface IdRow {
  id: bigint | number;
}

export interface EvaluationCriterionMutationErrorDetail {
  field: string;
  message: string;
}

export class EvaluationCriterionMutationValidationError extends Error {
  public readonly details: EvaluationCriterionMutationErrorDetail[];

  public constructor(
    details: EvaluationCriterionMutationErrorDetail[],
  ) {
    super(
      'No se ha podido guardar el criterio de evaluación porque hay datos no válidos.',
    );

    this.name = 'EvaluationCriterionMutationValidationError';
    this.details = details;
  }
}

async function ensureEvaluationCriteriaTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function toNumber(
  value: bigint | number,
): number {
  return Number(value);
}

function toBoolean(
  value: boolean | bigint | number,
): boolean {
  return value === true || Number(value) === 1;
}

function toIsoString(
  value: Date | string,
): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toISOString();
}

function toIsoStringOrNull(
  value: Date | string | null,
): string | null {
  return value === null
    ? null
    : toIsoString(value);
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeOptionalText(
  value: string | undefined,
): string | null {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

function mapEvaluationCriterionRow(
  row: EvaluationCriterionDetailRow,
): CurriculumEvaluationCriterionItem {
  return {
    id: toNumber(row.id),
    learningOutcomeId: toNumber(row.learning_outcome_id),
    learningOutcome: {
      id: toNumber(row.learning_outcome_id),
      code: row.learning_outcome_code,
      title: row.learning_outcome_title,
    },
    moduleId: toNumber(row.module_id),
    module: {
      id: toNumber(row.module_id),
      code: row.module_code,
      name: row.module_name,
      vocationalProgramme: {
        id: toNumber(row.vocational_programme_id),
        acronym: row.vocational_programme_acronym,
        name: row.vocational_programme_name,
      },
      academicLevel: {
        id: toNumber(row.academic_level_id),
        number: toNumber(row.academic_level_number),
        name: row.academic_level_name,
      },
    },
    code: row.code,
    title: row.title,
    description: row.description,
    sourceReference: row.source_reference,
    sortOrder: toNumber(row.sort_order),
    isActive: toBoolean(row.is_active),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toIsoStringOrNull(row.deleted_at),
  };
}

function isDuplicateKeyError(
  error: unknown,
): boolean {
  if (
    typeof error !== 'object'
    || error === null
  ) {
    return false;
  }

  const candidate = error as {
    code?: string;
    errno?: number;
  };

  return candidate.code === 'ER_DUP_ENTRY'
    || candidate.errno === 1062;
}

async function assertLearningOutcomeExists(
  learningOutcomeId: number,
): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<IdRow[]>(
    `
      SELECT id
      FROM module_learning_outcomes
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    learningOutcomeId,
  );

  if (!rows[0]) {
    throw new EvaluationCriterionMutationValidationError([
      {
        field: 'learningOutcomeId',
        message:
          'El Resultado de Aprendizaje seleccionado no existe o está archivado.',
      },
    ]);
  }
}

async function getEvaluationCriterionById(
  id: number,
): Promise<CurriculumEvaluationCriterionItem | null> {
  const rows = await prisma.$queryRawUnsafe<EvaluationCriterionDetailRow[]>(
    `
      SELECT
        ec.id,
        ec.learning_outcome_id,
        lo.code AS learning_outcome_code,
        lo.title AS learning_outcome_title,
        m.id AS module_id,
        m.code AS module_code,
        m.name AS module_name,
        vp.id AS vocational_programme_id,
        vp.acronym AS vocational_programme_acronym,
        vp.name AS vocational_programme_name,
        al.id AS academic_level_id,
        al.number AS academic_level_number,
        al.name AS academic_level_name,
        ec.code,
        ec.title,
        ec.description,
        ec.source_reference,
        ec.sort_order,
        ec.is_active,
        ec.created_at,
        ec.updated_at,
        ec.deleted_at
      FROM module_evaluation_criteria ec
      INNER JOIN module_learning_outcomes lo ON lo.id = ec.learning_outcome_id
      INNER JOIN modules m ON m.id = lo.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      WHERE ec.id = ?
      LIMIT 1
    `,
    id,
  );

  const row = rows[0];

  return row
    ? mapEvaluationCriterionRow(row)
    : null;
}

async function getEvaluationCriterionByOutcomeAndCode(
  learningOutcomeId: number,
  code: string,
): Promise<CurriculumEvaluationCriterionItem> {
  const rows = await prisma.$queryRawUnsafe<EvaluationCriterionDetailRow[]>(
    `
      SELECT
        ec.id,
        ec.learning_outcome_id,
        lo.code AS learning_outcome_code,
        lo.title AS learning_outcome_title,
        m.id AS module_id,
        m.code AS module_code,
        m.name AS module_name,
        vp.id AS vocational_programme_id,
        vp.acronym AS vocational_programme_acronym,
        vp.name AS vocational_programme_name,
        al.id AS academic_level_id,
        al.number AS academic_level_number,
        al.name AS academic_level_name,
        ec.code,
        ec.title,
        ec.description,
        ec.source_reference,
        ec.sort_order,
        ec.is_active,
        ec.created_at,
        ec.updated_at,
        ec.deleted_at
      FROM module_evaluation_criteria ec
      INNER JOIN module_learning_outcomes lo ON lo.id = ec.learning_outcome_id
      INNER JOIN modules m ON m.id = lo.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      WHERE ec.learning_outcome_id = ?
        AND ec.code = ?
      LIMIT 1
    `,
    learningOutcomeId,
    normalizeCode(code),
  );

  const row = rows[0];

  if (!row) {
    throw new Error(
      'No se ha podido recuperar el criterio de evaluación guardado.',
    );
  }

  return mapEvaluationCriterionRow(row);
}

async function assertEvaluationCriterionExists(
  id: number,
): Promise<CurriculumEvaluationCriterionItem> {
  const item = await getEvaluationCriterionById(id);

  if (!item) {
    throw new EvaluationCriterionMutationValidationError([
      {
        field: 'id',
        message:
          'El criterio de evaluación indicado no existe.',
      },
    ]);
  }

  return item;
}

export async function createEvaluationCriterion(
  input: EvaluationCriterionMutationInput,
): Promise<CurriculumEvaluationCriterionItem> {
  await ensureEvaluationCriteriaTable();
  await assertLearningOutcomeExists(input.learningOutcomeId);

  try {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO module_evaluation_criteria (
          learning_outcome_id,
          code,
          title,
          description,
          source_reference,
          sort_order,
          is_active,
          deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
      `,
      input.learningOutcomeId,
      normalizeCode(input.code),
      input.title.trim(),
      normalizeOptionalText(input.description),
      normalizeOptionalText(input.sourceReference),
      input.sortOrder,
      input.isActive,
    );
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      throw new EvaluationCriterionMutationValidationError([
        {
          field: 'code',
          message:
            'Ya existe un criterio de evaluación con ese código dentro del RA seleccionado.',
        },
      ]);
    }

    throw error;
  }

  return getEvaluationCriterionByOutcomeAndCode(
    input.learningOutcomeId,
    input.code,
  );
}

export async function updateEvaluationCriterion(
  id: number,
  input: EvaluationCriterionMutationInput,
): Promise<CurriculumEvaluationCriterionItem> {
  await ensureEvaluationCriteriaTable();
  await assertEvaluationCriterionExists(id);
  await assertLearningOutcomeExists(input.learningOutcomeId);

  try {
    await prisma.$executeRawUnsafe(
      `
        UPDATE module_evaluation_criteria
        SET
          learning_outcome_id = ?,
          code = ?,
          title = ?,
          description = ?,
          source_reference = ?,
          sort_order = ?,
          is_active = ?,
          deleted_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      input.learningOutcomeId,
      normalizeCode(input.code),
      input.title.trim(),
      normalizeOptionalText(input.description),
      normalizeOptionalText(input.sourceReference),
      input.sortOrder,
      input.isActive,
      id,
    );
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      throw new EvaluationCriterionMutationValidationError([
        {
          field: 'code',
          message:
            'Ya existe un criterio de evaluación con ese código dentro del RA seleccionado.',
        },
      ]);
    }

    throw error;
  }

  const updated = await getEvaluationCriterionById(id);

  if (!updated) {
    throw new Error(
      'No se ha podido recuperar el criterio de evaluación actualizado.',
    );
  }

  return updated;
}

export async function archiveEvaluationCriterion(
  id: number,
): Promise<CurriculumEvaluationCriterionItem> {
  await ensureEvaluationCriteriaTable();
  await assertEvaluationCriterionExists(id);

  await prisma.$executeRawUnsafe(
    `
      UPDATE module_evaluation_criteria
      SET
        is_active = FALSE,
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    id,
  );

  const archived = await getEvaluationCriterionById(id);

  if (!archived) {
    throw new Error(
      'No se ha podido recuperar el criterio de evaluación archivado.',
    );
  }

  return archived;
}

export async function restoreEvaluationCriterion(
  id: number,
): Promise<CurriculumEvaluationCriterionItem> {
  await ensureEvaluationCriteriaTable();
  await assertEvaluationCriterionExists(id);

  await prisma.$executeRawUnsafe(
    `
      UPDATE module_evaluation_criteria
      SET
        is_active = TRUE,
        deleted_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    id,
  );

  const restored = await getEvaluationCriterionById(id);

  if (!restored) {
    throw new Error(
      'No se ha podido recuperar el criterio de evaluación restaurado.',
    );
  }

  return restored;
}
