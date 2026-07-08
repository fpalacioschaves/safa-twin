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

interface WorkPlacementSummaryRow {
  programme_acronym: string;
  academic_level_number: NumberLike;
  students: NumberLike;
  without_placement: NumberLike;
  pending: NumberLike;
  assigned: NumberLike;
  active: NumberLike;
  completed: NumberLike;
  cancelled: NumberLike;
  documentation_pending: NumberLike;
}

export async function getWorkPlacementContext(
  intent: DigitalTwinIntent,
): Promise<DigitalTwinContext> {
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

  const rows = await prisma.$queryRawUnsafe<WorkPlacementSummaryRow[]>(
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
        ${getWhereSql(clauses)}
      )
      SELECT
        student_scope.programme_acronym,
        student_scope.academic_level_number,
        COUNT(DISTINCT student_scope.student_id) AS students,
        SUM(CASE WHEN wp.id IS NULL THEN 1 ELSE 0 END) AS without_placement,
        SUM(CASE WHEN wp.status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN wp.status = 'ASSIGNED' THEN 1 ELSE 0 END) AS assigned,
        SUM(CASE WHEN wp.status = 'ACTIVE' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN wp.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN wp.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN wp.documentation_pending = TRUE THEN 1 ELSE 0 END) AS documentation_pending
      FROM student_scope
      LEFT JOIN work_placements wp
        ON wp.student_id = student_scope.student_id
        AND wp.academic_year_id = student_scope.academic_year_id
        AND wp.centre_id = student_scope.centre_id
        AND wp.deleted_at IS NULL
      GROUP BY
        student_scope.programme_acronym,
        student_scope.academic_level_number
      ORDER BY
        student_scope.programme_acronym ASC,
        student_scope.academic_level_number ASC
      LIMIT 50
    `,
    ...values,
  );

  const items = rows.map((row) => ({
    programme: row.programme_acronym,
    academicLevel: toNumber(row.academic_level_number),
    students: toNumber(row.students),
    withoutPlacement: toNumber(row.without_placement),
    pending: toNumber(row.pending),
    assigned: toNumber(row.assigned),
    active: toNumber(row.active),
    completed: toNumber(row.completed),
    cancelled: toNumber(row.cancelled),
    documentationPending: toNumber(row.documentation_pending),
  }));

  const warnings = items.length === 0
    ? [
      'No se han encontrado alumnos o estancias formativas con los filtros interpretados.',
    ]
    : [];

  return {
    kind: 'work-placement-summary',
    title: 'Resumen de formación en empresa',
    summary:
      `Se han localizado ${items.length} agrupaciones de formación en empresa.`,
    warnings,
    data: {
      filters: intent,
      items,
    },
  };
}
