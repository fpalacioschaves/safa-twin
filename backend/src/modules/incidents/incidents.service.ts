import { prisma } from '../../config/database.js';

import type {
  CreateIncidentInput,
  IncidentSummaryQuery,
  ListIncidentsQuery,
  UpdateIncidentInput,
} from './incidents.schemas.js';

type NumberLike = bigint | number | string | null;

type DateLike = Date | string | null;

interface IncidentRow {
  id: NumberLike;
  student_id: NumberLike;
  student_code: string | null;
  student_full_name: string;
  academic_year_id: NumberLike;
  academic_year_name: string;
  centre_id: NumberLike;
  centre_name: string;
  module_id: NumberLike;
  module_code: string | null;
  module_name: string | null;
  vocational_programme_id: NumberLike;
  vocational_programme_acronym: string;
  academic_level_id: NumberLike;
  academic_level_number: NumberLike;
  created_by_user_id: NumberLike;
  created_by_user_name: string | null;
  type: string;
  severity: string;
  occurred_at: DateLike;
  title: string;
  description: string;
  resolution: string | null;
  resolved_at: DateLike;
  created_at: DateLike;
  updated_at: DateLike;
  deleted_at: DateLike;
}

interface CountRow {
  total: NumberLike;
}

interface SummaryRow {
  programme_acronym: string;
  academic_level_number: NumberLike;
  total_incidents: NumberLike;
  academic_incidents: NumberLike;
  behaviour_incidents: NumberLike;
  disciplinary_incidents: NumberLike;
  technical_incidents: NumberLike;
  company_related_incidents: NumberLike;
  other_incidents: NumberLike;
  low_incidents: NumberLike;
  medium_incidents: NumberLike;
  high_incidents: NumberLike;
  resolved_incidents: NumberLike;
  unresolved_incidents: NumberLike;
}

export class IncidentNotFoundError extends Error {
  public constructor() {
    super('La incidencia solicitada no existe.');
    this.name = 'IncidentNotFoundError';
  }
}

export class IncidentArchivedError extends Error {
  public constructor() {
    super('La incidencia está archivada y no puede modificarse.');
    this.name = 'IncidentArchivedError';
  }
}

export class IncidentAlreadyArchivedError extends Error {
  public constructor() {
    super('La incidencia ya está archivada.');
    this.name = 'IncidentAlreadyArchivedError';
  }
}

export class IncidentRelatedEntityUnavailableError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'IncidentRelatedEntityUnavailableError';
  }
}

function toNumber(value: NumberLike): number {
  if (value === null) {
    return 0;
  }

  return Number(value);
}

function toIsoString(value: DateLike): string | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toISOString();
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

function getBaseIncidentSelectSql(): string {
  return `
    SELECT
      i.id,
      s.id AS student_id,
      s.student_code,
      CONCAT(
        s.first_name,
        ' ',
        s.last_name_1,
        COALESCE(CONCAT(' ', s.last_name_2), '')
      ) AS student_full_name,
      ay.id AS academic_year_id,
      ay.name AS academic_year_name,
      c.id AS centre_id,
      c.name AS centre_name,
      m.id AS module_id,
      m.code AS module_code,
      m.name AS module_name,
      vp.id AS vocational_programme_id,
      vp.acronym AS vocational_programme_acronym,
      al.id AS academic_level_id,
      al.number AS academic_level_number,
      u.id AS created_by_user_id,
      u.name AS created_by_user_name,
      i.type,
      i.severity,
      i.occurred_at,
      i.title,
      i.description,
      i.resolution,
      i.resolved_at,
      i.created_at,
      i.updated_at,
      i.deleted_at
    FROM incidents i
    INNER JOIN students s ON s.id = i.student_id
    INNER JOIN academic_years ay ON ay.id = i.academic_year_id
    INNER JOIN centres c ON c.id = i.centre_id
    LEFT JOIN modules m ON m.id = i.module_id
    LEFT JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
    LEFT JOIN academic_levels al ON al.id = m.academic_level_id
    LEFT JOIN users u ON u.id = i.created_by_user_id
  `;
}

function mapIncident(row: IncidentRow) {
  return {
    id: toNumber(row.id),
    student: {
      id: toNumber(row.student_id),
      code: row.student_code,
      fullName: row.student_full_name,
    },
    academicYear: {
      id: toNumber(row.academic_year_id),
      name: row.academic_year_name,
    },
    centre: {
      id: toNumber(row.centre_id),
      name: row.centre_name,
    },
    module: row.module_id === null
      ? null
      : {
          id: toNumber(row.module_id),
          code: row.module_code,
          name: row.module_name,
        },
    vocationalProgramme: row.vocational_programme_id === null
      ? null
      : {
          id: toNumber(row.vocational_programme_id),
          acronym: row.vocational_programme_acronym,
        },
    academicLevel: row.academic_level_id === null
      ? null
      : {
          id: toNumber(row.academic_level_id),
          number: toNumber(row.academic_level_number),
        },
    createdByUser: row.created_by_user_id === null
      ? null
      : {
          id: toNumber(row.created_by_user_id),
          name: row.created_by_user_name,
        },
    type: row.type,
    severity: row.severity,
    occurredAt: toIsoString(row.occurred_at),
    title: row.title,
    description: row.description,
    resolution: row.resolution,
    resolvedAt: toIsoString(row.resolved_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toIsoString(row.deleted_at),
  };
}

function addCommonFilters(
  clauses: string[],
  values: unknown[],
  query: IncidentSummaryQuery | ListIncidentsQuery,
): void {
  clauses.push('i.deleted_at IS NULL');

  if (query.academicYearId !== undefined) {
    clauses.push('i.academic_year_id = ?');
    values.push(query.academicYearId);
  }

  if (query.centreId !== undefined) {
    clauses.push('i.centre_id = ?');
    values.push(query.centreId);
  }

  if (query.moduleId !== undefined) {
    clauses.push('i.module_id = ?');
    values.push(query.moduleId);
  }

  if (query.studentId !== undefined) {
    clauses.push('i.student_id = ?');
    values.push(query.studentId);
  }

  if (query.vocationalProgrammeId !== undefined) {
    clauses.push('vp.id = ?');
    values.push(query.vocationalProgrammeId);
  }

  if (query.academicLevelId !== undefined) {
    clauses.push('al.id = ?');
    values.push(query.academicLevelId);
  }

  if (query.type !== 'all') {
    clauses.push('i.type = ?');
    values.push(query.type);
  }

  if (query.severity !== 'all') {
    clauses.push('i.severity = ?');
    values.push(query.severity);
  }

  if (query.resolution === 'resolved') {
    clauses.push('i.resolved_at IS NOT NULL');
  }

  if (query.resolution === 'unresolved') {
    clauses.push('i.resolved_at IS NULL');
  }

  if (query.dateFrom !== undefined) {
    clauses.push('DATE(i.occurred_at) >= ?');
    values.push(query.dateFrom);
  }

  if (query.dateTo !== undefined) {
    clauses.push('DATE(i.occurred_at) <= ?');
    values.push(query.dateTo);
  }
}

function getWhereSql(clauses: string[]): string {
  return clauses.length === 0
    ? ''
    : `WHERE ${clauses.join(' AND ')}`;
}

async function ensureIncidentScopeExists(
  input: {
    studentId: number;
    academicYearId: number;
    centreId: number;
    moduleId: number | null;
  },
): Promise<void> {
  const clauses = [
    'en.student_id = ?',
    'en.academic_year_id = ?',
    'en.centre_id = ?',
    'en.status = \'ENROLLED\'',
    'en.deleted_at IS NULL',
    's.deleted_at IS NULL',
    'ay.deleted_at IS NULL',
    'c.deleted_at IS NULL',
  ];

  const values: unknown[] = [
    input.studentId,
    input.academicYearId,
    input.centreId,
  ];

  if (input.moduleId !== null) {
    clauses.push('en.module_id = ?');
    clauses.push('m.deleted_at IS NULL');
    values.push(input.moduleId);
  }

  const rows = await prisma.$queryRawUnsafe<CountRow[]>(
    `
      SELECT COUNT(*) AS total
      FROM enrolments en
      INNER JOIN students s ON s.id = en.student_id
      INNER JOIN academic_years ay ON ay.id = en.academic_year_id
      INNER JOIN centres c ON c.id = en.centre_id
      INNER JOIN modules m ON m.id = en.module_id
      WHERE ${clauses.join(' AND ')}
    `,
    ...values,
  );

  if (toNumber(rows[0]?.total ?? 0) === 0) {
    throw new IncidentRelatedEntityUnavailableError(
      input.moduleId === null
        ? 'No existe una matrícula activa que relacione ese alumno, curso académico y centro.'
        : 'No existe una matrícula activa que relacione ese alumno, curso académico, centro y módulo.',
    );
  }
}

export async function listIncidents(
  query: ListIncidentsQuery,
) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  addCommonFilters(clauses, values, query);

  if (query.search) {
    clauses.push(`(
      s.student_code LIKE ?
      OR s.first_name LIKE ?
      OR s.last_name_1 LIKE ?
      OR s.last_name_2 LIKE ?
      OR s.email LIKE ?
      OR m.code LIKE ?
      OR m.name LIKE ?
      OR i.title LIKE ?
      OR i.description LIKE ?
      OR i.resolution LIKE ?
    )`);

    const searchValue = `%${query.search}%`;
    values.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
    );
  }

  const whereSql = getWhereSql(clauses);
  const skip = (query.page - 1) * query.pageSize;

  const countRows = await prisma.$queryRawUnsafe<CountRow[]>(
    `
      SELECT COUNT(DISTINCT i.id) AS total
      FROM incidents i
      INNER JOIN students s ON s.id = i.student_id
      LEFT JOIN modules m ON m.id = i.module_id
      LEFT JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      LEFT JOIN academic_levels al ON al.id = m.academic_level_id
      ${whereSql}
    `,
    ...values,
  );

  const rows = await prisma.$queryRawUnsafe<IncidentRow[]>(
    `
      ${getBaseIncidentSelectSql()}
      ${whereSql}
      ORDER BY
        i.occurred_at DESC,
        i.severity DESC,
        s.last_name_1 ASC,
        s.last_name_2 ASC,
        s.first_name ASC,
        i.id DESC
      LIMIT ? OFFSET ?
    `,
    ...values,
    query.pageSize,
    skip,
  );

  const total = toNumber(countRows[0]?.total ?? 0);

  return {
    items: rows.map(mapIncident),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function getIncidentById(
  incidentId: number,
) {
  const rows = await prisma.$queryRawUnsafe<IncidentRow[]>(
    `
      ${getBaseIncidentSelectSql()}
      WHERE i.id = ?
      LIMIT 1
    `,
    incidentId,
  );

  const incident = rows[0];

  if (!incident) {
    throw new IncidentNotFoundError();
  }

  return mapIncident(incident);
}

export async function createIncident(
  input: CreateIncidentInput,
  createdByUserId: number | null,
) {
  await ensureIncidentScopeExists(input);

  const result = await prisma.$executeRawUnsafe(
    `
      INSERT INTO incidents (
        student_id,
        academic_year_id,
        centre_id,
        module_id,
        created_by_user_id,
        type,
        severity,
        occurred_at,
        title,
        description,
        resolution,
        resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    input.studentId,
    input.academicYearId,
    input.centreId,
    input.moduleId,
    createdByUserId,
    new Date(input.occurredAt),
    input.type,
    input.severity,
    new Date(input.occurredAt),
    input.title,
    input.description,
    normalizeOptionalText(input.resolution),
    input.resolvedAt === undefined
      ? null
      : new Date(input.resolvedAt),
  );

  if (result !== 1) {
    throw new Error(
      'No se pudo crear la incidencia.',
    );
  }

  const insertedRows = await prisma.$queryRawUnsafe<{
    id: NumberLike;
  }[]>(
    'SELECT LAST_INSERT_ID() AS id',
  );

  return await getIncidentById(
    toNumber(insertedRows[0]?.id ?? 0),
  );
}

export async function updateIncident(
  incidentId: number,
  input: UpdateIncidentInput,
) {
  const existingIncident = await getIncidentById(incidentId);

  if (existingIncident.deletedAt !== null) {
    throw new IncidentArchivedError();
  }

  await ensureIncidentScopeExists(input);

  await prisma.$executeRawUnsafe(
    `
      UPDATE incidents
      SET
        student_id = ?,
        academic_year_id = ?,
        centre_id = ?,
        module_id = ?,
        type = ?,
        severity = ?,
        occurred_at = ?,
        title = ?,
        description = ?,
        resolution = ?,
        resolved_at = ?
      WHERE id = ?
        AND deleted_at IS NULL
    `,
    input.studentId,
    input.academicYearId,
    input.centreId,
    input.moduleId,
    input.type,
    input.severity,
    new Date(input.occurredAt),
    input.title,
    input.description,
    normalizeOptionalText(input.resolution),
    input.resolvedAt === undefined
      ? null
      : new Date(input.resolvedAt),
    incidentId,
  );

  return await getIncidentById(incidentId);
}

export async function archiveIncident(
  incidentId: number,
) {
  const existingIncident = await getIncidentById(incidentId);

  if (existingIncident.deletedAt !== null) {
    throw new IncidentAlreadyArchivedError();
  }

  await prisma.$executeRawUnsafe(
    `
      UPDATE incidents
      SET deleted_at = CURRENT_TIMESTAMP(0)
      WHERE id = ?
        AND deleted_at IS NULL
    `,
    incidentId,
  );

  return {
    archived: true,
  };
}

export async function getIncidentsSummary(
  query: IncidentSummaryQuery,
) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  addCommonFilters(clauses, values, query);

  const whereSql = getWhereSql(clauses);

  const rows = await prisma.$queryRawUnsafe<SummaryRow[]>(
    `
      SELECT
        COALESCE(vp.acronym, 'SIN_MODULO') AS programme_acronym,
        COALESCE(al.number, 0) AS academic_level_number,
        COUNT(DISTINCT i.id) AS total_incidents,
        COUNT(DISTINCT CASE WHEN i.type = 'ACADEMIC' THEN i.id END) AS academic_incidents,
        COUNT(DISTINCT CASE WHEN i.type = 'BEHAVIOUR' THEN i.id END) AS behaviour_incidents,
        COUNT(DISTINCT CASE WHEN i.type = 'DISCIPLINARY' THEN i.id END) AS disciplinary_incidents,
        COUNT(DISTINCT CASE WHEN i.type = 'TECHNICAL' THEN i.id END) AS technical_incidents,
        COUNT(DISTINCT CASE WHEN i.type = 'COMPANY_RELATED' THEN i.id END) AS company_related_incidents,
        COUNT(DISTINCT CASE WHEN i.type = 'OTHER' THEN i.id END) AS other_incidents,
        COUNT(DISTINCT CASE WHEN i.severity = 'LOW' THEN i.id END) AS low_incidents,
        COUNT(DISTINCT CASE WHEN i.severity = 'MEDIUM' THEN i.id END) AS medium_incidents,
        COUNT(DISTINCT CASE WHEN i.severity = 'HIGH' THEN i.id END) AS high_incidents,
        COUNT(DISTINCT CASE WHEN i.resolved_at IS NOT NULL THEN i.id END) AS resolved_incidents,
        COUNT(DISTINCT CASE WHEN i.resolved_at IS NULL THEN i.id END) AS unresolved_incidents
      FROM incidents i
      INNER JOIN students s ON s.id = i.student_id
      LEFT JOIN modules m ON m.id = i.module_id
      LEFT JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      LEFT JOIN academic_levels al ON al.id = m.academic_level_id
      ${whereSql}
      GROUP BY
        COALESCE(vp.acronym, 'SIN_MODULO'),
        COALESCE(al.number, 0)
      ORDER BY
        programme_acronym ASC,
        academic_level_number ASC
      LIMIT 100
    `,
    ...values,
  );

  const items = rows.map((row) => ({
    programme: row.programme_acronym,
    academicLevel: toNumber(row.academic_level_number),
    totalIncidents: toNumber(row.total_incidents),
    academicIncidents: toNumber(row.academic_incidents),
    behaviourIncidents: toNumber(row.behaviour_incidents),
    disciplinaryIncidents: toNumber(row.disciplinary_incidents),
    technicalIncidents: toNumber(row.technical_incidents),
    companyRelatedIncidents: toNumber(row.company_related_incidents),
    otherIncidents: toNumber(row.other_incidents),
    lowIncidents: toNumber(row.low_incidents),
    mediumIncidents: toNumber(row.medium_incidents),
    highIncidents: toNumber(row.high_incidents),
    resolvedIncidents: toNumber(row.resolved_incidents),
    unresolvedIncidents: toNumber(row.unresolved_incidents),
  }));

  return {
    items,
    totals: items.reduce(
      (totals, item) => ({
        totalIncidents:
          totals.totalIncidents + item.totalIncidents,
        academicIncidents:
          totals.academicIncidents + item.academicIncidents,
        behaviourIncidents:
          totals.behaviourIncidents + item.behaviourIncidents,
        disciplinaryIncidents:
          totals.disciplinaryIncidents + item.disciplinaryIncidents,
        technicalIncidents:
          totals.technicalIncidents + item.technicalIncidents,
        companyRelatedIncidents:
          totals.companyRelatedIncidents + item.companyRelatedIncidents,
        otherIncidents:
          totals.otherIncidents + item.otherIncidents,
        lowIncidents:
          totals.lowIncidents + item.lowIncidents,
        mediumIncidents:
          totals.mediumIncidents + item.mediumIncidents,
        highIncidents:
          totals.highIncidents + item.highIncidents,
        resolvedIncidents:
          totals.resolvedIncidents + item.resolvedIncidents,
        unresolvedIncidents:
          totals.unresolvedIncidents + item.unresolvedIncidents,
      }),
      {
        totalIncidents: 0,
        academicIncidents: 0,
        behaviourIncidents: 0,
        disciplinaryIncidents: 0,
        technicalIncidents: 0,
        companyRelatedIncidents: 0,
        otherIncidents: 0,
        lowIncidents: 0,
        mediumIncidents: 0,
        highIncidents: 0,
        resolvedIncidents: 0,
        unresolvedIncidents: 0,
      },
    ),
  };
}
