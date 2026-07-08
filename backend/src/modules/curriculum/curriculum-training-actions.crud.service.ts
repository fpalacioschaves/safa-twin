import { prisma } from '../../config/database.js';

import type {
  CurriculumTrainingActionItem,
} from './curriculum.service.js';

import type {
  TrainingActionMutationInput,
} from './curriculum.schemas.js';

interface TrainingActionDetailRow {
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
  planned_hours: string | number | null;
  source_reference: string | null;
  sort_order: bigint | number;
  is_active: boolean | bigint | number;
  related_learning_outcomes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
}

interface IdRow {
  id: bigint | number;
}

interface LearningOutcomeModuleRow {
  id: bigint | number;
  module_id: bigint | number;
}

interface RawDatabase {
  $executeRawUnsafe: (
    query: string,
    ...values: unknown[]
  ) => Promise<number>;

  $queryRawUnsafe: <T = unknown>(
    query: string,
    ...values: unknown[]
  ) => Promise<T>;
}

export interface TrainingActionMutationErrorDetail {
  field: string;
  message: string;
}

export class TrainingActionMutationValidationError extends Error {
  public readonly details: TrainingActionMutationErrorDetail[];

  public constructor(
    details: TrainingActionMutationErrorDetail[],
  ) {
    super(
      'No se ha podido guardar la acción formativa porque hay datos no válidos.',
    );

    this.name = 'TrainingActionMutationValidationError';
    this.details = details;
  }
}

async function ensureTrainingActionTables(): Promise<void> {
  await prisma.$executeRawUnsafe(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await prisma.$executeRawUnsafe(`
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

function parseRelatedLearningOutcomes(
  value: string | null,
): {
  id: number;
  code: string;
  title: string;
}[] {
  if (!value) {
    return [];
  }

  return value
    .split('||')
    .map((item) => item.split('::'))
    .filter((parts) => parts.length === 3)
    .map(([id, code, title]) => ({
      id: Number(id),
      code,
      title,
    }))
    .filter((item) => Number.isInteger(item.id));
}

function mapTrainingActionRow(
  row: TrainingActionDetailRow,
): CurriculumTrainingActionItem {
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
    plannedHours: row.planned_hours === null
      ? null
      : Number(row.planned_hours),
    sourceReference: row.source_reference,
    sortOrder: toNumber(row.sort_order),
    isActive: toBoolean(row.is_active),
    relatedLearningOutcomes: parseRelatedLearningOutcomes(
      row.related_learning_outcomes,
    ),
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
    throw new TrainingActionMutationValidationError([
      {
        field: 'moduleId',
        message:
          'El módulo seleccionado no existe o está archivado.',
      },
    ]);
  }
}

async function assertRelatedLearningOutcomesBelongToModule(
  database: RawDatabase,
  moduleId: number,
  learningOutcomeIds: number[],
): Promise<void> {
  if (learningOutcomeIds.length === 0) {
    return;
  }

  const uniqueIds = Array.from(new Set(learningOutcomeIds));
  const placeholders = uniqueIds.map(() => '?').join(', ');

  const rows = await database.$queryRawUnsafe<LearningOutcomeModuleRow[]>(
    `
      SELECT id, module_id
      FROM module_learning_outcomes
      WHERE id IN (${placeholders})
        AND deleted_at IS NULL
    `,
    ...uniqueIds,
  );

  const foundIds = new Set(rows.map((row) => toNumber(row.id)));
  const missingIds = uniqueIds.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    throw new TrainingActionMutationValidationError([
      {
        field: 'relatedLearningOutcomeIds',
        message:
          `Hay RA relacionados que no existen o están archivados: ${missingIds.join(', ')}.`,
      },
    ]);
  }

  const foreignIds = rows
    .filter((row) => toNumber(row.module_id) !== moduleId)
    .map((row) => toNumber(row.id));

  if (foreignIds.length > 0) {
    throw new TrainingActionMutationValidationError([
      {
        field: 'relatedLearningOutcomeIds',
        message:
          `Hay RA relacionados que no pertenecen al módulo seleccionado: ${foreignIds.join(', ')}.`,
      },
    ]);
  }
}

async function getTrainingActionById(
  id: number,
): Promise<CurriculumTrainingActionItem | null> {
  const rows = await prisma.$queryRawUnsafe<TrainingActionDetailRow[]>(
    `
      SELECT
        ta.id,
        ta.module_id,
        m.code AS module_code,
        m.name AS module_name,
        vp.id AS vocational_programme_id,
        vp.acronym AS vocational_programme_acronym,
        vp.name AS vocational_programme_name,
        al.id AS academic_level_id,
        al.number AS academic_level_number,
        al.name AS academic_level_name,
        ta.code,
        ta.title,
        ta.description,
        ta.planned_hours,
        ta.source_reference,
        ta.sort_order,
        ta.is_active,
        GROUP_CONCAT(
          CONCAT(lo.id, '::', lo.code, '::', lo.title)
          ORDER BY lo.sort_order ASC, lo.code ASC
          SEPARATOR '||'
        ) AS related_learning_outcomes,
        ta.created_at,
        ta.updated_at,
        ta.deleted_at
      FROM module_training_actions ta
      INNER JOIN modules m ON m.id = ta.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      LEFT JOIN module_training_action_learning_outcomes talo
        ON talo.training_action_id = ta.id
      LEFT JOIN module_learning_outcomes lo
        ON lo.id = talo.learning_outcome_id
      WHERE ta.id = ?
      GROUP BY
        ta.id,
        ta.module_id,
        m.code,
        m.name,
        vp.id,
        vp.acronym,
        vp.name,
        al.id,
        al.number,
        al.name,
        ta.code,
        ta.title,
        ta.description,
        ta.planned_hours,
        ta.source_reference,
        ta.sort_order,
        ta.is_active,
        ta.created_at,
        ta.updated_at,
        ta.deleted_at
      LIMIT 1
    `,
    id,
  );

  const row = rows[0];

  return row
    ? mapTrainingActionRow(row)
    : null;
}

async function getTrainingActionByModuleAndCode(
  moduleId: number,
  code: string,
): Promise<CurriculumTrainingActionItem> {
  const rows = await prisma.$queryRawUnsafe<IdRow[]>(
    `
      SELECT id
      FROM module_training_actions
      WHERE module_id = ?
        AND code = ?
      LIMIT 1
    `,
    moduleId,
    normalizeCode(code),
  );

  const row = rows[0];

  if (!row) {
    throw new Error(
      'No se ha podido recuperar la acción formativa guardada.',
    );
  }

  const item = await getTrainingActionById(toNumber(row.id));

  if (!item) {
    throw new Error(
      'No se ha podido recuperar la acción formativa guardada.',
    );
  }

  return item;
}

async function assertTrainingActionExists(
  id: number,
): Promise<CurriculumTrainingActionItem> {
  const item = await getTrainingActionById(id);

  if (!item) {
    throw new TrainingActionMutationValidationError([
      {
        field: 'id',
        message:
          'La acción formativa indicada no existe.',
      },
    ]);
  }

  return item;
}

async function replaceTrainingActionLinks(
  database: RawDatabase,
  trainingActionId: number,
  moduleId: number,
  relatedLearningOutcomeIds: number[],
): Promise<void> {
  const uniqueIds = Array.from(new Set(relatedLearningOutcomeIds));

  await assertRelatedLearningOutcomesBelongToModule(
    database,
    moduleId,
    uniqueIds,
  );

  await database.$executeRawUnsafe(
    `
      DELETE FROM module_training_action_learning_outcomes
      WHERE training_action_id = ?
    `,
    trainingActionId,
  );

  for (const learningOutcomeId of uniqueIds) {
    await database.$executeRawUnsafe(
      `
        INSERT INTO module_training_action_learning_outcomes (
          training_action_id,
          learning_outcome_id
        ) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
          created_at = created_at
      `,
      trainingActionId,
      learningOutcomeId,
    );
  }
}

export async function createTrainingAction(
  input: TrainingActionMutationInput,
): Promise<CurriculumTrainingActionItem> {
  await ensureTrainingActionTables();
  await assertModuleExists(input.moduleId);

  try {
    await prisma.$transaction(async (transaction) => {
      const database = transaction as unknown as RawDatabase;

      await database.$executeRawUnsafe(
        `
          INSERT INTO module_training_actions (
            module_id,
            code,
            title,
            description,
            planned_hours,
            source_reference,
            sort_order,
            is_active,
            deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
        `,
        input.moduleId,
        normalizeCode(input.code),
        input.title.trim(),
        normalizeOptionalText(input.description),
        input.plannedHours ?? null,
        normalizeOptionalText(input.sourceReference),
        input.sortOrder,
        input.isActive,
      );

      const created = await database.$queryRawUnsafe<IdRow[]>(
        `
          SELECT id
          FROM module_training_actions
          WHERE module_id = ?
            AND code = ?
          LIMIT 1
        `,
        input.moduleId,
        normalizeCode(input.code),
      );

      const createdRow = created[0];

      if (!createdRow) {
        throw new Error(
          'No se ha podido recuperar la acción formativa creada.',
        );
      }

      await replaceTrainingActionLinks(
        database,
        toNumber(createdRow.id),
        input.moduleId,
        input.relatedLearningOutcomeIds,
      );
    });
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      throw new TrainingActionMutationValidationError([
        {
          field: 'code',
          message:
            'Ya existe una acción formativa con ese código dentro del módulo seleccionado.',
        },
      ]);
    }

    throw error;
  }

  return getTrainingActionByModuleAndCode(
    input.moduleId,
    input.code,
  );
}

export async function updateTrainingAction(
  id: number,
  input: TrainingActionMutationInput,
): Promise<CurriculumTrainingActionItem> {
  await ensureTrainingActionTables();
  await assertTrainingActionExists(id);
  await assertModuleExists(input.moduleId);

  try {
    await prisma.$transaction(async (transaction) => {
      const database = transaction as unknown as RawDatabase;

      await database.$executeRawUnsafe(
        `
          UPDATE module_training_actions
          SET
            module_id = ?,
            code = ?,
            title = ?,
            description = ?,
            planned_hours = ?,
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
        input.plannedHours ?? null,
        normalizeOptionalText(input.sourceReference),
        input.sortOrder,
        input.isActive,
        id,
      );

      await replaceTrainingActionLinks(
        database,
        id,
        input.moduleId,
        input.relatedLearningOutcomeIds,
      );
    });
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      throw new TrainingActionMutationValidationError([
        {
          field: 'code',
          message:
            'Ya existe una acción formativa con ese código dentro del módulo seleccionado.',
        },
      ]);
    }

    throw error;
  }

  const updated = await getTrainingActionById(id);

  if (!updated) {
    throw new Error(
      'No se ha podido recuperar la acción formativa actualizada.',
    );
  }

  return updated;
}

export async function archiveTrainingAction(
  id: number,
): Promise<CurriculumTrainingActionItem> {
  await ensureTrainingActionTables();
  await assertTrainingActionExists(id);

  await prisma.$executeRawUnsafe(
    `
      UPDATE module_training_actions
      SET
        is_active = FALSE,
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    id,
  );

  const archived = await getTrainingActionById(id);

  if (!archived) {
    throw new Error(
      'No se ha podido recuperar la acción formativa archivada.',
    );
  }

  return archived;
}

export async function restoreTrainingAction(
  id: number,
): Promise<CurriculumTrainingActionItem> {
  await ensureTrainingActionTables();
  await assertTrainingActionExists(id);

  await prisma.$executeRawUnsafe(
    `
      UPDATE module_training_actions
      SET
        is_active = TRUE,
        deleted_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    id,
  );

  const restored = await getTrainingActionById(id);

  if (!restored) {
    throw new Error(
      'No se ha podido recuperar la acción formativa restaurada.',
    );
  }

  return restored;
}
