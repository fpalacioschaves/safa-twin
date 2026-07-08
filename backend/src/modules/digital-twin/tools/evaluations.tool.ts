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
  roundPercentage,
  toNullableNumber,
  toNumber,
} from './digital-twin-tool.helpers.js';

interface EvaluationSummaryRow {
  academic_year_name: string | null;
  evaluation_code: string | null;
  evaluation_name: string | null;
  evaluation_status: string | null;
  programme_acronym: string;
  academic_level_number: NumberLike;
  module_code: string;
  module_name: string;
  enrolled: NumberLike;
  grades_recorded: NumberLike;
  evaluated: NumberLike;
  passed: NumberLike;
  failed: NumberLike;
  not_evaluated: NumberLike;
  average_grade: NumberLike;
}

export async function getEvaluationContext(
  intent: DigitalTwinIntent,
): Promise<DigitalTwinContext> {
  const clauses = [
    'ay.is_current = TRUE',
    'en.deleted_at IS NULL',
    'en.status = \'ENROLLED\'',
    'e.deleted_at IS NULL',
  ];

  const values: unknown[] = [];

  addProgrammeAndLevelFilters(
    clauses,
    values,
    intent,
  );

  if (intent.evaluationCode !== null) {
    clauses.push(
      '(UPPER(e.code) = ? OR UPPER(e.name) LIKE ?)',
    );

    values.push(
      intent.evaluationCode.toUpperCase(),
      `%${intent.evaluationCode.toUpperCase()}%`,
    );
  }

  const rows = await prisma.$queryRawUnsafe<EvaluationSummaryRow[]>(
    `
      SELECT
        ay.name AS academic_year_name,
        e.code AS evaluation_code,
        e.name AS evaluation_name,
        e.status AS evaluation_status,
        vp.acronym AS programme_acronym,
        al.number AS academic_level_number,
        m.code AS module_code,
        m.name AS module_name,
        COUNT(DISTINCT en.id) AS enrolled,
        COUNT(DISTINCT g.id) AS grades_recorded,
        SUM(
          CASE
            WHEN g.id IS NOT NULL
              AND (
                g.final_grade IS NOT NULL
                OR g.numeric_grade IS NOT NULL
                OR COALESCE(gs.is_evaluable, FALSE) = TRUE
              )
            THEN 1
            ELSE 0
          END
        ) AS evaluated,
        SUM(
          CASE
            WHEN g.id IS NOT NULL
              AND (
                g.is_passed = TRUE
                OR COALESCE(g.final_grade, g.numeric_grade) >= 5
              )
            THEN 1
            ELSE 0
          END
        ) AS passed,
        SUM(
          CASE
            WHEN g.id IS NOT NULL
              AND (
                g.final_grade IS NOT NULL
                OR g.numeric_grade IS NOT NULL
                OR COALESCE(gs.is_evaluable, FALSE) = TRUE
              )
              AND NOT (
                g.is_passed = TRUE
                OR COALESCE(g.final_grade, g.numeric_grade) >= 5
              )
            THEN 1
            ELSE 0
          END
        ) AS failed,
        SUM(
          CASE
            WHEN g.id IS NULL
              OR NOT (
                g.final_grade IS NOT NULL
                OR g.numeric_grade IS NOT NULL
                OR COALESCE(gs.is_evaluable, FALSE) = TRUE
              )
            THEN 1
            ELSE 0
          END
        ) AS not_evaluated,
        AVG(COALESCE(g.final_grade, g.numeric_grade)) AS average_grade
      FROM enrolments en
      INNER JOIN academic_years ay ON ay.id = en.academic_year_id
      INNER JOIN modules m ON m.id = en.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      INNER JOIN evaluations e
        ON e.academic_year_id = en.academic_year_id
        AND e.centre_id = en.centre_id
      LEFT JOIN grades g
        ON g.enrolment_id = en.id
        AND g.evaluation_id = e.id
        AND g.deleted_at IS NULL
      LEFT JOIN grade_statuses gs ON gs.id = g.grade_status_id
      ${getWhereSql(clauses)}
      GROUP BY
        ay.name,
        e.code,
        e.name,
        e.status,
        vp.acronym,
        al.number,
        m.code,
        m.name,
        m.sort_order
      ORDER BY
        ay.name DESC,
        e.sequence ASC,
        vp.acronym ASC,
        al.number ASC,
        m.sort_order ASC,
        m.name ASC
      LIMIT 120
    `,
    ...values,
  );

  const items = rows.map((row) => {
    const enrolled = toNumber(row.enrolled);
    const evaluated = toNumber(row.evaluated);
    const passed = toNumber(row.passed);

    return {
      academicYear: row.academic_year_name,
      evaluation: {
        code: row.evaluation_code,
        name: row.evaluation_name,
        status: row.evaluation_status,
      },
      programme: row.programme_acronym,
      academicLevel: toNumber(row.academic_level_number),
      module: {
        code: row.module_code,
        name: row.module_name,
      },
      enrolled,
      gradesRecorded: toNumber(row.grades_recorded),
      evaluated,
      passed,
      failed: toNumber(row.failed),
      notEvaluated: toNumber(row.not_evaluated),
      successRate: evaluated > 0
        ? roundPercentage((passed / evaluated) * 100)
        : null,
      performanceRate: enrolled > 0
        ? roundPercentage((passed / enrolled) * 100)
        : null,
      averageGrade: toNullableNumber(row.average_grade),
    };
  });

  const warnings: string[] = [];

  if (items.length === 0) {
    warnings.push(
      'No se han encontrado datos de evaluación con los filtros interpretados.',
    );
  }

  if (intent.evaluationCode === null) {
    warnings.push(
      'No se indicó una evaluación concreta. Se han incluido las evaluaciones disponibles del curso actual.',
    );
  }

  return {
    kind: 'evaluation-summary',
    title: 'Resumen de evaluación',
    summary:
      `Se han localizado ${items.length} combinaciones de evaluación, ciclo, curso y módulo.`,
    warnings,
    data: {
      filters: intent,
      items,
    },
  };
}
