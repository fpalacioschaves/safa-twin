import { prisma } from '../../config/database.js';

import type {
  CurriculumLearningOutcomeItem,
} from './curriculum.service.js';

import type {
  LearningOutcomeMutationInput,
} from './curriculum.schemas.js';

interface LearningOutcomeDetailRow {
  id: bigint | number;
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

export interface CurriculumMutationErrorDetail {
  field: string;
  message: string;
}

export class CurriculumMutationValidationError extends Error {
  public readonly details: CurriculumMutationErrorDetail[];

  public constructor(
    details: CurriculumMutationErrorDetail[],
  ) {
    super(
      'No se ha podido guardar el resultado de aprendizaje porque hay datos no válidos.',
    );

    this.name = 'CurriculumMutationValidationError';
    this.details = details;
  }
}

async function ensureLearningOutcomeTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
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

function mapLearningOutcomeRow(
  row: LearningOutcomeDetailRow,
): CurriculumLearningOutcomeItem {
  return {
    id: toNumber(row.id),
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

async function assertModuleExists(
  moduleId: number,
): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<IdRow[]>(
    `
      SELECT id
      FROM modules
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    moduleId,
  );

  if (!rows[0]) {
    throw new CurriculumMutationValidationError([
      {
        field: 'moduleId',
        message:
          'El módulo seleccionado no existe o está archivado.',
      },
    ]);
  }
}

async function getLearningOutcomeById(
  id: number,
): Promise<CurriculumLearningOutcomeItem | null> {
  const rows = await prisma.$queryRawUnsafe<LearningOutcomeDetailRow[]>(
    `
      SELECT
        lo.id,
        lo.module_id,
        m.code AS module_code,
        m.name AS module_name,
        vp.id AS vocational_programme_id,
        vp.acronym AS vocational_programme_acronym,
        vp.name AS vocational_programme_name,
        al.id AS academic_level_id,
        al.number AS academic_level_number,
        al.name AS academic_level_name,
        lo.code,
        lo.title,
        lo.description,
        lo.source_reference,
        lo.sort_order,
        lo.is_active,
        lo.created_at,
        lo.updated_at,
        lo.deleted_at
      FROM module_learning_outcomes lo
      INNER JOIN modules m ON m.id = lo.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      WHERE lo.id = ?
      LIMIT 1
    `,
    id,
  );

  const row = rows[0];

  return row
    ? mapLearningOutcomeRow(row)
    : null;
}

async function getLearningOutcomeByModuleAndCode(
  moduleId: number,
  code: string,
): Promise<CurriculumLearningOutcomeItem> {
  const rows = await prisma.$queryRawUnsafe<LearningOutcomeDetailRow[]>(
    `
      SELECT
        lo.id,
        lo.module_id,
        m.code AS module_code,
        m.name AS module_name,
        vp.id AS vocational_programme_id,
        vp.acronym AS vocational_programme_acronym,
        vp.name AS vocational_programme_name,
        al.id AS academic_level_id,
        al.number AS academic_level_number,
        al.name AS academic_level_name,
        lo.code,
        lo.title,
        lo.description,
        lo.source_reference,
        lo.sort_order,
        lo.is_active,
        lo.created_at,
        lo.updated_at,
        lo.deleted_at
      FROM module_learning_outcomes lo
      INNER JOIN modules m ON m.id = lo.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      WHERE lo.module_id = ?
        AND lo.code = ?
      LIMIT 1
    `,
    moduleId,
    normalizeCode(code),
  );

  const row = rows[0];

  if (!row) {
    throw new Error(
      'No se ha podido recuperar el resultado de aprendizaje guardado.',
    );
  }

  return mapLearningOutcomeRow(row);
}

async function assertLearningOutcomeExists(
  id: number,
): Promise<CurriculumLearningOutcomeItem> {
  const item = await getLearningOutcomeById(id);

  if (!item) {
    throw new CurriculumMutationValidationError([
      {
        field: 'id',
        message:
          'El resultado de aprendizaje indicado no existe.',
      },
    ]);
  }

  return item;
}

export async function createLearningOutcome(
  input: LearningOutcomeMutationInput,
): Promise<CurriculumLearningOutcomeItem> {
  await ensureLearningOutcomeTable();
  await assertModuleExists(input.moduleId);

  try {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO module_learning_outcomes (
          module_id,
          code,
          title,
          description,
          source_reference,
          sort_order,
          is_active,
          deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
      `,
      input.moduleId,
      normalizeCode(input.code),
      input.title.trim(),
      normalizeOptionalText(input.description),
      normalizeOptionalText(input.sourceReference),
      input.sortOrder,
      input.isActive,
    );
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      throw new CurriculumMutationValidationError([
        {
          field: 'code',
          message:
            'Ya existe un resultado de aprendizaje con ese código dentro del módulo seleccionado.',
        },
      ]);
    }

    throw error;
  }

  return getLearningOutcomeByModuleAndCode(
    input.moduleId,
    input.code,
  );
}

export async function updateLearningOutcome(
  id: number,
  input: LearningOutcomeMutationInput,
): Promise<CurriculumLearningOutcomeItem> {
  await ensureLearningOutcomeTable();
  await assertLearningOutcomeExists(id);
  await assertModuleExists(input.moduleId);

  try {
    await prisma.$executeRawUnsafe(
      `
        UPDATE module_learning_outcomes
        SET
          module_id = ?,
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
      input.moduleId,
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
      throw new CurriculumMutationValidationError([
        {
          field: 'code',
          message:
            'Ya existe un resultado de aprendizaje con ese código dentro del módulo seleccionado.',
        },
      ]);
    }

    throw error;
  }

  const updated = await getLearningOutcomeById(id);

  if (!updated) {
    throw new Error(
      'No se ha podido recuperar el resultado de aprendizaje actualizado.',
    );
  }

  return updated;
}

export async function archiveLearningOutcome(
  id: number,
): Promise<CurriculumLearningOutcomeItem> {
  await ensureLearningOutcomeTable();
  await assertLearningOutcomeExists(id);

  await prisma.$executeRawUnsafe(
    `
      UPDATE module_learning_outcomes
      SET
        is_active = FALSE,
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    id,
  );

  const archived = await getLearningOutcomeById(id);

  if (!archived) {
    throw new Error(
      'No se ha podido recuperar el resultado de aprendizaje archivado.',
    );
  }

  return archived;
}

export async function restoreLearningOutcome(
  id: number,
): Promise<CurriculumLearningOutcomeItem> {
  await ensureLearningOutcomeTable();
  await assertLearningOutcomeExists(id);

  await prisma.$executeRawUnsafe(
    `
      UPDATE module_learning_outcomes
      SET
        is_active = TRUE,
        deleted_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    id,
  );

  const restored = await getLearningOutcomeById(id);

  if (!restored) {
    throw new Error(
      'No se ha podido recuperar el resultado de aprendizaje restaurado.',
    );
  }

  return restored;
}
