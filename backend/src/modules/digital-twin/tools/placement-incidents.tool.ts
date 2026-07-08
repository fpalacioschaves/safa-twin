import { prisma } from '../../../config/database.js';

import type {
  DigitalTwinIntent,
} from '../digital-twin.schemas.js';

import type {
  DigitalTwinContext,
  NumberLike,
} from '../digital-twin.types.js';

import {
  addProgrammeAndLevelFilters,
  getWhereSql,
  toNumber,
} from './digital-twin-tool.helpers.js';

interface CombinedIncidentSummaryRow {
  source: string;
  programme_acronym: string;
  academic_level_number: NumberLike;
  total_incidents: NumberLike;
  low_incidents: NumberLike;
  medium_incidents: NumberLike;
  high_incidents: NumberLike;
  resolved_incidents: NumberLike;
  unresolved_incidents: NumberLike;
}

interface CombinedIncidentPreviewRow {
  source: string;
  id: NumberLike;
  student_name: string;
  programme_acronym: string;
  academic_level_number: NumberLike;
  related_entity: string | null;
  severity: string;
  occurred_at: Date | string;
  title: string;
  resolved_at: Date | string | null;
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

function buildScope(
  intent: DigitalTwinIntent): {
  clauses: string[];
  values: unknown[];
} {
  const clauses = [
    'ay.is_current = TRUE',
    'en.deleted_at IS NULL',
    'en.status = \'ENROLLED\'',
    's.deleted_at IS NULL',
    's.is_active = TRUE',
  ];

  const values: unknown[] = [];

  addProgrammeAndLevelFilters(
    clauses,
    values,
    intent,
  );

  return {
    clauses,
    values,
  };
}

export async function getPlacementIncidentsContext(
  intent: DigitalTwinIntent,
): Promise<DigitalTwinContext> {
  const scope = buildScope(intent);
  const scopeSql = getWhereSql(scope.clauses);

  const summaryRows = await prisma.$queryRawUnsafe<CombinedIncidentSummaryRow[]>(
    `
      WITH student_scope AS (
        SELECT DISTINCT
          s.id AS student_id,
          ay.id AS academic_year_id,
          en.centre_id,
          vp.acronym AS programme_acronym,
          al.number AS academic_level_number
        FROM students s
        INNER JOIN enrolments en ON en.student_id = s.id
        INNER JOIN academic_years ay ON ay.id = en.academic_year_id
        INNER JOIN modules m ON m.id = en.module_id
        INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
        INNER JOIN academic_levels al ON al.id = m.academic_level_id
        ${scopeSql}
      )
      SELECT
        'academic' AS source,
        student_scope.programme_acronym,
        student_scope.academic_level_number,
        COUNT(DISTINCT i.id) AS total_incidents,
        COUNT(DISTINCT CASE WHEN i.severity = 'LOW' THEN i.id END) AS low_incidents,
        COUNT(DISTINCT CASE WHEN i.severity = 'MEDIUM' THEN i.id END) AS medium_incidents,
        COUNT(DISTINCT CASE WHEN i.severity = 'HIGH' THEN i.id END) AS high_incidents,
        COUNT(DISTINCT CASE WHEN i.resolved_at IS NOT NULL THEN i.id END) AS resolved_incidents,
        COUNT(DISTINCT CASE WHEN i.resolved_at IS NULL THEN i.id END) AS unresolved_incidents
      FROM student_scope
      INNER JOIN incidents i
        ON i.student_id = student_scope.student_id
        AND i.academic_year_id = student_scope.academic_year_id
        AND i.centre_id = student_scope.centre_id
        AND i.deleted_at IS NULL
      GROUP BY
        student_scope.programme_acronym,
        student_scope.academic_level_number
      UNION ALL
      SELECT
        'company' AS source,
        student_scope.programme_acronym,
        student_scope.academic_level_number,
        COUNT(DISTINCT pi.id) AS total_incidents,
        COUNT(DISTINCT CASE WHEN pi.severity = 'LOW' THEN pi.id END) AS low_incidents,
        COUNT(DISTINCT CASE WHEN pi.severity = 'MEDIUM' THEN pi.id END) AS medium_incidents,
        COUNT(DISTINCT CASE WHEN pi.severity = 'HIGH' THEN pi.id END) AS high_incidents,
        COUNT(DISTINCT CASE WHEN pi.resolved_at IS NOT NULL THEN pi.id END) AS resolved_incidents,
        COUNT(DISTINCT CASE WHEN pi.resolved_at IS NULL THEN pi.id END) AS unresolved_incidents
      FROM student_scope
      INNER JOIN work_placements wp
        ON wp.student_id = student_scope.student_id
        AND wp.academic_year_id = student_scope.academic_year_id
        AND wp.centre_id = student_scope.centre_id
        AND wp.deleted_at IS NULL
      INNER JOIN placement_incidents pi
        ON pi.work_placement_id = wp.id
        AND pi.deleted_at IS NULL
      GROUP BY
        student_scope.programme_acronym,
        student_scope.academic_level_number
      ORDER BY
        source ASC,
        programme_acronym ASC,
        academic_level_number ASC
      LIMIT 100
    `,
    ...scope.values,
    ...scope.values,
  );

  const previewRows = await prisma.$queryRawUnsafe<CombinedIncidentPreviewRow[]>(
    `
      WITH student_scope AS (
        SELECT DISTINCT
          s.id AS student_id,
          ay.id AS academic_year_id,
          en.centre_id,
          vp.acronym AS programme_acronym,
          al.number AS academic_level_number
        FROM students s
        INNER JOIN enrolments en ON en.student_id = s.id
        INNER JOIN academic_years ay ON ay.id = en.academic_year_id
        INNER JOIN modules m ON m.id = en.module_id
        INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
        INNER JOIN academic_levels al ON al.id = m.academic_level_id
        ${scopeSql}
      )
      SELECT DISTINCT
        'academic' AS source,
        i.id,
        CONCAT(
          s.first_name,
          ' ',
          s.last_name_1,
          COALESCE(CONCAT(' ', s.last_name_2), '')
        ) AS student_name,
        student_scope.programme_acronym,
        student_scope.academic_level_number,
        m.name AS related_entity,
        i.severity,
        i.occurred_at,
        i.title,
        i.resolved_at
      FROM student_scope
      INNER JOIN students s ON s.id = student_scope.student_id
      INNER JOIN incidents i
        ON i.student_id = student_scope.student_id
        AND i.academic_year_id = student_scope.academic_year_id
        AND i.centre_id = student_scope.centre_id
        AND i.deleted_at IS NULL
      LEFT JOIN modules m ON m.id = i.module_id
      UNION ALL
      SELECT DISTINCT
        'company' AS source,
        pi.id,
        CONCAT(
          s.first_name,
          ' ',
          s.last_name_1,
          COALESCE(CONCAT(' ', s.last_name_2), '')
        ) AS student_name,
        student_scope.programme_acronym,
        student_scope.academic_level_number,
        c.name AS related_entity,
        pi.severity,
        pi.occurred_at,
        pi.title,
        pi.resolved_at
      FROM student_scope
      INNER JOIN students s ON s.id = student_scope.student_id
      INNER JOIN work_placements wp
        ON wp.student_id = student_scope.student_id
        AND wp.academic_year_id = student_scope.academic_year_id
        AND wp.centre_id = student_scope.centre_id
        AND wp.deleted_at IS NULL
      INNER JOIN companies c ON c.id = wp.company_id
      INNER JOIN placement_incidents pi
        ON pi.work_placement_id = wp.id
        AND pi.deleted_at IS NULL
      ORDER BY
        occurred_at DESC,
        severity DESC,
        student_name ASC
      LIMIT 25
    `,
    ...scope.values,
    ...scope.values,
  );

  const summary = summaryRows.map((row) => ({
    source: row.source,
    programme: row.programme_acronym,
    academicLevel: toNumber(row.academic_level_number),
    totalIncidents: toNumber(row.total_incidents),
    lowIncidents: toNumber(row.low_incidents),
    mediumIncidents: toNumber(row.medium_incidents),
    highIncidents: toNumber(row.high_incidents),
    resolvedIncidents: toNumber(row.resolved_incidents),
    unresolvedIncidents: toNumber(row.unresolved_incidents),
  }));

  const preview = previewRows.map((row) => ({
    source: row.source,
    id: toNumber(row.id),
    student: row.student_name,
    programme: row.programme_acronym,
    academicLevel: toNumber(row.academic_level_number),
    relatedEntity: row.related_entity,
    severity: row.severity,
    occurredAt: toIsoString(row.occurred_at),
    title: row.title,
    resolvedAt: toIsoStringOrNull(row.resolved_at),
  }));

  const totals = summary.reduce(
    (total, item) => ({
      totalIncidents:
        total.totalIncidents + item.totalIncidents,
      academicIncidents:
        total.academicIncidents
        + (item.source === 'academic' ? item.totalIncidents : 0),
      companyIncidents:
        total.companyIncidents
        + (item.source === 'company' ? item.totalIncidents : 0),
      highIncidents:
        total.highIncidents + item.highIncidents,
      unresolvedIncidents:
        total.unresolvedIncidents + item.unresolvedIncidents,
    }),
    {
      totalIncidents: 0,
      academicIncidents: 0,
      companyIncidents: 0,
      highIncidents: 0,
      unresolvedIncidents: 0,
    },
  );

  const warnings = totals.totalIncidents === 0
    ? [
      'No se han encontrado incidencias académicas ni de formación en empresa con los filtros interpretados.',
    ]
    : [];

  return {
    kind: 'incidents-summary',
    title: 'Resumen combinado de incidencias',
    summary:
      `Se han localizado ${totals.totalIncidents} incidencias: ${totals.academicIncidents} académicas y ${totals.companyIncidents} de formación en empresa.`,
    warnings,
    data: {
      filters: intent,
      totals,
      summary,
      preview,
    },
  };
}
