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

interface PlacementIncidentSummaryRow {
  programme_acronym: string;
  academic_level_number: NumberLike;
  total_incidents: NumberLike;
  low_incidents: NumberLike;
  medium_incidents: NumberLike;
  high_incidents: NumberLike;
  resolved_incidents: NumberLike;
  unresolved_incidents: NumberLike;
}

interface PlacementIncidentPreviewRow {
  id: NumberLike;
  student_name: string;
  programme_acronym: string;
  academic_level_number: NumberLike;
  company_name: string;
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

export async function getPlacementIncidentsContext(
  intent: DigitalTwinIntent,
): Promise<DigitalTwinContext> {
  const scopeClauses = [
    'ay.is_current = TRUE',
    'en.deleted_at IS NULL',
    'en.status = \'ENROLLED\'',
    's.deleted_at IS NULL',
    's.is_active = TRUE',
  ];

  const scopeValues: unknown[] = [];

  addProgrammeAndLevelFilters(
    scopeClauses,
    scopeValues,
    intent,
  );

  const scopeSql = getWhereSql(scopeClauses);

  const summaryRows = await prisma.$queryRawUnsafe<PlacementIncidentSummaryRow[]>(
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
        student_scope.programme_acronym ASC,
        student_scope.academic_level_number ASC
      LIMIT 50
    `,
    ...scopeValues,
  );

  const previewRows = await prisma.$queryRawUnsafe<PlacementIncidentPreviewRow[]>(
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
        pi.id,
        CONCAT(
          s.first_name,
          ' ',
          s.last_name_1,
          COALESCE(CONCAT(' ', s.last_name_2), '')
        ) AS student_name,
        student_scope.programme_acronym,
        student_scope.academic_level_number,
        c.name AS company_name,
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
        pi.occurred_at DESC,
        pi.severity DESC,
        s.last_name_1 ASC,
        s.last_name_2 ASC,
        s.first_name ASC
      LIMIT 25
    `,
    ...scopeValues,
  );

  const summary = summaryRows.map((row) => ({
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
    id: toNumber(row.id),
    student: row.student_name,
    programme: row.programme_acronym,
    academicLevel: toNumber(row.academic_level_number),
    company: row.company_name,
    severity: row.severity,
    occurredAt: toIsoString(row.occurred_at),
    title: row.title,
    resolvedAt: toIsoStringOrNull(row.resolved_at),
  }));

  const totalIncidents = summary.reduce(
    (total, item) => total + item.totalIncidents,
    0,
  );

  const warnings = totalIncidents === 0
    ? [
      'No se han encontrado incidencias de formación en empresa con los filtros interpretados.',
    ]
    : [
      'Esta consulta usa placement_incidents, es decir, incidencias de formación en empresa. El modelo actual aún no contiene una tabla general de incidencias académicas.',
    ];

  return {
    kind: 'incidents-summary',
    title: 'Resumen de incidencias de formación en empresa',
    summary:
      `Se han localizado ${totalIncidents} incidencias de formación en empresa.`,
    warnings,
    data: {
      filters: intent,
      summary,
      preview,
    },
  };
}
