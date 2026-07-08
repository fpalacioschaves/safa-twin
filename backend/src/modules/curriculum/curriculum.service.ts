import { prisma } from '../../config/database.js';

import type {
  CurriculumImportInput,
  CurriculumListQuery,
} from './curriculum.schemas.js';

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

interface ModuleLocator {
  moduleCode: string;
  vocationalProgrammeAcronym?: string;
  academicLevelNumber?: number;
}

interface ModuleResolutionRow {
  id: bigint | number;
  code: string;
  name: string;
  vocational_programme_acronym: string;
  academic_level_number: bigint | number;
}

interface LearningOutcomeRow {
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

interface EvaluationCriterionRow {
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

interface TrainingActionRow {
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

interface CountRow {
  total: bigint | number;
}

export interface CurriculumModuleSummary {
  id: number;
  code: string;
  name: string;
  vocationalProgramme: {
    id: number;
    acronym: string;
    name: string;
  };
  academicLevel: {
    id: number;
    number: number;
    name: string;
  };
}

export interface CurriculumLearningOutcomeItem {
  id: number;
  moduleId: number;
  module: CurriculumModuleSummary;
  code: string;
  title: string;
  description: string | null;
  sourceReference: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CurriculumEvaluationCriterionItem {
  id: number;
  learningOutcomeId: number;
  learningOutcome: {
    id: number;
    code: string;
    title: string;
  };
  moduleId: number;
  module: CurriculumModuleSummary;
  code: string;
  title: string;
  description: string | null;
  sourceReference: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CurriculumTrainingActionItem {
  id: number;
  moduleId: number;
  module: CurriculumModuleSummary;
  code: string;
  title: string;
  description: string | null;
  plannedHours: number | null;
  sourceReference: string | null;
  sortOrder: number;
  isActive: boolean;
  relatedLearningOutcomes: {
    id: number;
    code: string;
    title: string;
  }[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CurriculumListResult<TItem> {
  items: TItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CurriculumImportResult {
  summary: {
    learningOutcomesProcessed: number;
    evaluationCriteriaProcessed: number;
    trainingActionsProcessed: number;
    linksProcessed: number;
  };
}

export interface CurriculumImportErrorDetail {
  field: string;
  message: string;
}

export class CurriculumImportValidationError extends Error {
  public readonly details: CurriculumImportErrorDetail[];

  public constructor(
    details: CurriculumImportErrorDetail[],
  ) {
    super(
      'No se ha podido importar el currículo porque hay referencias no válidas.',
    );

    this.name = 'CurriculumImportValidationError';
    this.details = details;
  }
}

async function ensureCurriculumTables(): Promise<void> {
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

function getFallbackSourceReference(
  input: CurriculumImportInput,
): string | null {
  return normalizeOptionalText(input.sourceName)
    ?? normalizeOptionalText(input.sourceUrl);
}

function getModuleSummary(
  row: LearningOutcomeRow | EvaluationCriterionRow | TrainingActionRow,
): CurriculumModuleSummary {
  return {
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
  };
}

function mapLearningOutcome(
  row: LearningOutcomeRow,
): CurriculumLearningOutcomeItem {
  return {
    id: toNumber(row.id),
    moduleId: toNumber(row.module_id),
    module: getModuleSummary(row),
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

function mapEvaluationCriterion(
  row: EvaluationCriterionRow,
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
    module: getModuleSummary(row),
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

function mapTrainingAction(
  row: TrainingActionRow,
): CurriculumTrainingActionItem {
  return {
    id: toNumber(row.id),
    moduleId: toNumber(row.module_id),
    module: getModuleSummary(row),
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

function addCommonFilters(
  clauses: string[],
  values: unknown[],
  query: CurriculumListQuery,
  tableAlias: string,
  learningOutcomeAlias: string | null = null,
): void {
  if (query.moduleId !== undefined) {
    clauses.push('m.id = ?');
    values.push(query.moduleId);
  }

  if (
    query.learningOutcomeId !== undefined
    && learningOutcomeAlias
  ) {
    clauses.push(`${learningOutcomeAlias}.id = ?`);
    values.push(query.learningOutcomeId);
  }

  if (query.vocationalProgrammeAcronym !== undefined) {
    clauses.push('vp.acronym = ?');
    values.push(query.vocationalProgrammeAcronym);
  }

  if (query.academicLevelNumber !== undefined) {
    clauses.push('al.number = ?');
    values.push(query.academicLevelNumber);
  }

  if (query.status === 'active') {
    clauses.push(`${tableAlias}.is_active = TRUE`);
    clauses.push(`${tableAlias}.deleted_at IS NULL`);
  }

  if (query.status === 'inactive') {
    clauses.push(`${tableAlias}.is_active = FALSE`);
    clauses.push(`${tableAlias}.deleted_at IS NULL`);
  }

  if (query.status === 'archived') {
    clauses.push(`${tableAlias}.deleted_at IS NOT NULL`);
  }

  if (query.search) {
    const pattern = `%${query.search}%`;
    const searchParts = [
      `${tableAlias}.code LIKE ?`,
      `${tableAlias}.title LIKE ?`,
      `${tableAlias}.description LIKE ?`,
      'm.code LIKE ?',
      'm.name LIKE ?',
      'vp.acronym LIKE ?',
      'vp.name LIKE ?',
    ];

    values.push(
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
    );

    if (
      learningOutcomeAlias
      && learningOutcomeAlias !== tableAlias
    ) {
      searchParts.push(`${learningOutcomeAlias}.code LIKE ?`);
      searchParts.push(`${learningOutcomeAlias}.title LIKE ?`);
      values.push(
        pattern,
        pattern,
      );
    }

    clauses.push(`(${searchParts.join(' OR ')})`);
  }
}

function getWhereSql(
  clauses: string[],
): string {
  return clauses.length === 0
    ? ''
    : `WHERE ${clauses.join(' AND ')}`;
}

function getPagination(
  query: CurriculumListQuery,
  total: number,
) {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(
      1,
      Math.ceil(total / query.pageSize),
    ),
  };
}

export async function listLearningOutcomes(
  query: CurriculumListQuery,
): Promise<CurriculumListResult<CurriculumLearningOutcomeItem>> {
  await ensureCurriculumTables();

  const clauses: string[] = [];
  const values: unknown[] = [];

  addCommonFilters(
    clauses,
    values,
    query,
    'lo',
    'lo',
  );

  const whereSql = getWhereSql(clauses);
  const offset = (query.page - 1) * query.pageSize;

  const countRows = await prisma.$queryRawUnsafe<CountRow[]>(
    `
      SELECT COUNT(*) AS total
      FROM module_learning_outcomes lo
      INNER JOIN modules m ON m.id = lo.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${whereSql}
    `,
    ...values,
  );

  const rows = await prisma.$queryRawUnsafe<LearningOutcomeRow[]>(
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
      ${whereSql}
      ORDER BY
        vp.acronym ASC,
        al.number ASC,
        m.sort_order ASC,
        m.name ASC,
        lo.sort_order ASC,
        lo.code ASC
      LIMIT ?
      OFFSET ?
    `,
    ...values,
    query.pageSize,
    offset,
  );

  const total = Number(countRows[0]?.total ?? 0);

  return {
    items: rows.map(mapLearningOutcome),
    pagination: getPagination(
      query,
      total,
    ),
  };
}

export async function listEvaluationCriteria(
  query: CurriculumListQuery,
): Promise<CurriculumListResult<CurriculumEvaluationCriterionItem>> {
  await ensureCurriculumTables();

  const clauses: string[] = [];
  const values: unknown[] = [];

  addCommonFilters(
    clauses,
    values,
    query,
    'ec',
    'lo',
  );

  const whereSql = getWhereSql(clauses);
  const offset = (query.page - 1) * query.pageSize;

  const countRows = await prisma.$queryRawUnsafe<CountRow[]>(
    `
      SELECT COUNT(*) AS total
      FROM module_evaluation_criteria ec
      INNER JOIN module_learning_outcomes lo ON lo.id = ec.learning_outcome_id
      INNER JOIN modules m ON m.id = lo.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${whereSql}
    `,
    ...values,
  );

  const rows = await prisma.$queryRawUnsafe<EvaluationCriterionRow[]>(
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
      ${whereSql}
      ORDER BY
        vp.acronym ASC,
        al.number ASC,
        m.sort_order ASC,
        m.name ASC,
        lo.sort_order ASC,
        lo.code ASC,
        ec.sort_order ASC,
        ec.code ASC
      LIMIT ?
      OFFSET ?
    `,
    ...values,
    query.pageSize,
    offset,
  );

  const total = Number(countRows[0]?.total ?? 0);

  return {
    items: rows.map(mapEvaluationCriterion),
    pagination: getPagination(
      query,
      total,
    ),
  };
}

export async function listTrainingActions(
  query: CurriculumListQuery,
): Promise<CurriculumListResult<CurriculumTrainingActionItem>> {
  await ensureCurriculumTables();

  const clauses: string[] = [];
  const values: unknown[] = [];

  addCommonFilters(
    clauses,
    values,
    query,
    'ta',
  );

  const whereSql = getWhereSql(clauses);
  const offset = (query.page - 1) * query.pageSize;

  const countRows = await prisma.$queryRawUnsafe<CountRow[]>(
    `
      SELECT COUNT(*) AS total
      FROM module_training_actions ta
      INNER JOIN modules m ON m.id = ta.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${whereSql}
    `,
    ...values,
  );

  const rows = await prisma.$queryRawUnsafe<TrainingActionRow[]>(
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
      ${whereSql}
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
      ORDER BY
        vp.acronym ASC,
        al.number ASC,
        m.sort_order ASC,
        m.name ASC,
        ta.sort_order ASC,
        ta.code ASC
      LIMIT ?
      OFFSET ?
    `,
    ...values,
    query.pageSize,
    offset,
  );

  const total = Number(countRows[0]?.total ?? 0);

  return {
    items: rows.map(mapTrainingAction),
    pagination: getPagination(
      query,
      total,
    ),
  };
}

async function resolveModule(
  database: RawDatabase,
  locator: ModuleLocator,
  fieldPrefix: string,
): Promise<ModuleResolutionRow> {
  const clauses = [
    'm.code = ?',
    'm.deleted_at IS NULL',
  ];

  const values: unknown[] = [
    normalizeCode(locator.moduleCode),
  ];

  if (locator.vocationalProgrammeAcronym) {
    clauses.push('vp.acronym = ?');
    values.push(locator.vocationalProgrammeAcronym);
  }

  if (locator.academicLevelNumber !== undefined) {
    clauses.push('al.number = ?');
    values.push(locator.academicLevelNumber);
  }

  const rows = await database.$queryRawUnsafe<ModuleResolutionRow[]>(
    `
      SELECT
        m.id,
        m.code,
        m.name,
        vp.acronym AS vocational_programme_acronym,
        al.number AS academic_level_number
      FROM modules m
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY vp.acronym ASC, al.number ASC, m.code ASC
    `,
    ...values,
  );

  if (rows.length === 0) {
    throw new CurriculumImportValidationError([
      {
        field: `${fieldPrefix}.moduleCode`,
        message:
          `No existe ningún módulo activo con el código "${locator.moduleCode}" y los filtros indicados.`,
      },
    ]);
  }

  if (rows.length > 1) {
    throw new CurriculumImportValidationError([
      {
        field: `${fieldPrefix}.moduleCode`,
        message:
          `El código de módulo "${locator.moduleCode}" es ambiguo. Indica vocationalProgrammeAcronym y, si procede, academicLevelNumber.`,
      },
    ]);
  }

  return rows[0];
}

async function getLearningOutcomeId(
  database: RawDatabase,
  moduleId: number,
  code: string,
): Promise<number | null> {
  const rows = await database.$queryRawUnsafe<IdRow[]>(
    `
      SELECT id
      FROM module_learning_outcomes
      WHERE module_id = ?
        AND code = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    moduleId,
    normalizeCode(code),
  );

  const row = rows[0];

  return row
    ? toNumber(row.id)
    : null;
}

async function getTrainingActionId(
  database: RawDatabase,
  moduleId: number,
  code: string,
): Promise<number> {
  const rows = await database.$queryRawUnsafe<IdRow[]>(
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
      'No se ha podido recuperar la acción formativa importada.',
    );
  }

  return toNumber(row.id);
}

async function upsertLearningOutcome(
  database: RawDatabase,
  moduleId: number,
  item: CurriculumImportInput['learningOutcomes'][number],
  fallbackSourceReference: string | null,
): Promise<void> {
  await database.$executeRawUnsafe(
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
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        source_reference = VALUES(source_reference),
        sort_order = VALUES(sort_order),
        is_active = VALUES(is_active),
        deleted_at = NULL
    `,
    moduleId,
    normalizeCode(item.code),
    item.title.trim(),
    normalizeOptionalText(item.description),
    normalizeOptionalText(item.sourceReference)
      ?? fallbackSourceReference,
    item.sortOrder,
    item.isActive,
  );
}

async function upsertEvaluationCriterion(
  database: RawDatabase,
  learningOutcomeId: number,
  item: CurriculumImportInput['evaluationCriteria'][number],
  fallbackSourceReference: string | null,
): Promise<void> {
  await database.$executeRawUnsafe(
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
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        source_reference = VALUES(source_reference),
        sort_order = VALUES(sort_order),
        is_active = VALUES(is_active),
        deleted_at = NULL
    `,
    learningOutcomeId,
    normalizeCode(item.code),
    item.title.trim(),
    normalizeOptionalText(item.description),
    normalizeOptionalText(item.sourceReference)
      ?? fallbackSourceReference,
    item.sortOrder,
    item.isActive,
  );
}

async function upsertTrainingAction(
  database: RawDatabase,
  moduleId: number,
  item: CurriculumImportInput['trainingActions'][number],
  fallbackSourceReference: string | null,
): Promise<number> {
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
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        planned_hours = VALUES(planned_hours),
        source_reference = VALUES(source_reference),
        sort_order = VALUES(sort_order),
        is_active = VALUES(is_active),
        deleted_at = NULL
    `,
    moduleId,
    normalizeCode(item.code),
    item.title.trim(),
    normalizeOptionalText(item.description),
    item.plannedHours ?? null,
    normalizeOptionalText(item.sourceReference)
      ?? fallbackSourceReference,
    item.sortOrder,
    item.isActive,
  );

  return getTrainingActionId(
    database,
    moduleId,
    item.code,
  );
}

async function replaceTrainingActionLinks(
  database: RawDatabase,
  trainingActionId: number,
  moduleId: number,
  relatedLearningOutcomeCodes: string[],
  fieldPrefix: string,
): Promise<number> {
  await database.$executeRawUnsafe(
    `
      DELETE FROM module_training_action_learning_outcomes
      WHERE training_action_id = ?
    `,
    trainingActionId,
  );

  let linksProcessed = 0;

  for (
    const relatedLearningOutcomeCode
    of relatedLearningOutcomeCodes
  ) {
    const learningOutcomeId = await getLearningOutcomeId(
      database,
      moduleId,
      relatedLearningOutcomeCode,
    );

    if (learningOutcomeId === null) {
      throw new CurriculumImportValidationError([
        {
          field: fieldPrefix,
          message:
            `La acción formativa referencia el RA "${relatedLearningOutcomeCode}", pero ese RA no existe en el mismo módulo.`,
        },
      ]);
    }

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

    linksProcessed += 1;
  }

  return linksProcessed;
}

export async function importCurriculum(
  input: CurriculumImportInput,
): Promise<CurriculumImportResult> {
  await ensureCurriculumTables();

  const fallbackSourceReference =
    getFallbackSourceReference(input);

  let learningOutcomesProcessed = 0;
  let evaluationCriteriaProcessed = 0;
  let trainingActionsProcessed = 0;
  let linksProcessed = 0;

  await prisma.$transaction(async (transaction) => {
    const database = transaction as unknown as RawDatabase;

    for (
      const [index, item]
      of input.learningOutcomes.entries()
    ) {
      const module = await resolveModule(
        database,
        item,
        `learningOutcomes.${index}`,
      );

      await upsertLearningOutcome(
        database,
        toNumber(module.id),
        item,
        fallbackSourceReference,
      );

      learningOutcomesProcessed += 1;
    }

    for (
      const [index, item]
      of input.evaluationCriteria.entries()
    ) {
      const module = await resolveModule(
        database,
        item,
        `evaluationCriteria.${index}`,
      );

      const moduleId = toNumber(module.id);
      const learningOutcomeId = await getLearningOutcomeId(
        database,
        moduleId,
        item.learningOutcomeCode,
      );

      if (learningOutcomeId === null) {
        throw new CurriculumImportValidationError([
          {
            field:
              `evaluationCriteria.${index}.learningOutcomeCode`,
            message:
              `El criterio referencia el RA "${item.learningOutcomeCode}", pero ese RA no existe en el mismo módulo.`,
          },
        ]);
      }

      await upsertEvaluationCriterion(
        database,
        learningOutcomeId,
        item,
        fallbackSourceReference,
      );

      evaluationCriteriaProcessed += 1;
    }

    for (
      const [index, item]
      of input.trainingActions.entries()
    ) {
      const module = await resolveModule(
        database,
        item,
        `trainingActions.${index}`,
      );

      const moduleId = toNumber(module.id);

      const trainingActionId = await upsertTrainingAction(
        database,
        moduleId,
        item,
        fallbackSourceReference,
      );

      trainingActionsProcessed += 1;

      linksProcessed += await replaceTrainingActionLinks(
        database,
        trainingActionId,
        moduleId,
        item.relatedLearningOutcomeCodes,
        `trainingActions.${index}.relatedLearningOutcomeCodes`,
      );
    }
  });

  return {
    summary: {
      learningOutcomesProcessed,
      evaluationCriteriaProcessed,
      trainingActionsProcessed,
      linksProcessed,
    },
  };
}
