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
  toNumber,
} from './digital-twin-tool.helpers.js';

interface AcademicFollowupRow {
  student_id: NumberLike;
  student_code: string | null;
  student_full_name: string;
  programme_acronym: string;
  academic_level_number: NumberLike;
  enrolled_modules: NumberLike;
  evaluation_count: NumberLike;
  expected_grade_records: NumberLike;
  grade_records: NumberLike;
  numeric_grades: NumberLike;
  passed_grades: NumberLike;
  failed_grades: NumberLike;
  non_evaluable_states: NumberLike;
  open_incidents: NumberLike;
  high_open_incidents: NumberLike;
}

interface ModuleRiskRow {
  programme_acronym: string;
  academic_level_number: NumberLike;
  module_code: string;
  module_name: string;
  enrolled_students: NumberLike;
  expected_grade_records: NumberLike;
  grade_records: NumberLike;
  passed_grades: NumberLike;
  failed_grades: NumberLike;
  non_evaluable_states: NumberLike;
  open_incidents: NumberLike;
}

function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score >= 6) {
    return 'HIGH';
  }

  if (score >= 3) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function getRiskReasons(item: {
  missingGradeRecords: number;
  failedGrades: number;
  nonEvaluableStates: number;
  openIncidents: number;
  highOpenIncidents: number;
}): string[] {
  const reasons: string[] = [];

  if (item.missingGradeRecords > 0) {
    reasons.push(
      `Tiene ${item.missingGradeRecords} calificaciones esperadas sin registro.`,
    );
  }

  if (item.failedGrades > 0) {
    reasons.push(
      `Tiene ${item.failedGrades} calificaciones suspensas.`,
    );
  }

  if (item.nonEvaluableStates > 0) {
    reasons.push(
      `Tiene ${item.nonEvaluableStates} estados no evaluables o no ordinarios.`,
    );
  }

  if (item.openIncidents > 0) {
    reasons.push(
      `Tiene ${item.openIncidents} incidencias abiertas.`,
    );
  }

  if (item.highOpenIncidents > 0) {
    reasons.push(
      `Tiene ${item.highOpenIncidents} incidencias graves abiertas.`,
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      'No presenta señales objetivas de riesgo con los datos disponibles.',
    );
  }

  return reasons;
}

export async function getAcademicFollowupContext(
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

  const whereSql = getWhereSql(clauses);

  const studentRows = await prisma.$queryRawUnsafe<AcademicFollowupRow[]>(
    `
      WITH student_scope AS (
        SELECT DISTINCT
          s.id AS student_id,
          s.student_code,
          CONCAT(
            s.first_name,
            ' ',
            s.last_name_1,
            COALESCE(CONCAT(' ', s.last_name_2), '')
          ) AS student_full_name,
          ay.id AS academic_year_id,
          en.centre_id,
          vp.acronym AS programme_acronym,
          al.number AS academic_level_number,
          en.id AS enrolment_id
        FROM enrolments en
        INNER JOIN students s ON s.id = en.student_id
        INNER JOIN academic_years ay ON ay.id = en.academic_year_id
        INNER JOIN modules m ON m.id = en.module_id
        INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
        INNER JOIN academic_levels al ON al.id = m.academic_level_id
        ${whereSql}
      ),
      evaluation_scope AS (
        SELECT DISTINCT
          e.id AS evaluation_id,
          e.academic_year_id,
          e.centre_id
        FROM evaluations e
        WHERE e.deleted_at IS NULL
      ),
      grade_scope AS (
        SELECT
          ss.student_id,
          ss.programme_acronym,
          ss.academic_level_number,
          COUNT(DISTINCT ss.enrolment_id) AS enrolled_modules,
          COUNT(DISTINCT es.evaluation_id) AS evaluation_count,
          COUNT(DISTINCT CONCAT(ss.enrolment_id, '-', es.evaluation_id)) AS expected_grade_records,
          COUNT(DISTINCT g.id) AS grade_records,
          COUNT(DISTINCT CASE
            WHEN COALESCE(g.final_grade, g.numeric_grade) IS NOT NULL THEN g.id
          END) AS numeric_grades,
          COUNT(DISTINCT CASE
            WHEN g.id IS NOT NULL
              AND (
                g.is_passed = TRUE
                OR COALESCE(g.final_grade, g.numeric_grade) >= 5
              )
            THEN g.id
          END) AS passed_grades,
          COUNT(DISTINCT CASE
            WHEN g.id IS NOT NULL
              AND COALESCE(g.final_grade, g.numeric_grade) IS NOT NULL
              AND NOT (
                g.is_passed = TRUE
                OR COALESCE(g.final_grade, g.numeric_grade) >= 5
              )
            THEN g.id
          END) AS failed_grades,
          COUNT(DISTINCT CASE
            WHEN g.id IS NOT NULL
              AND gs.id IS NOT NULL
              AND COALESCE(gs.is_evaluable, FALSE) = FALSE
            THEN g.id
          END) AS non_evaluable_states
        FROM student_scope ss
        LEFT JOIN evaluation_scope es
          ON es.academic_year_id = ss.academic_year_id
          AND es.centre_id = ss.centre_id
        LEFT JOIN grades g
          ON g.enrolment_id = ss.enrolment_id
          AND g.evaluation_id = es.evaluation_id
          AND g.deleted_at IS NULL
        LEFT JOIN grade_statuses gs ON gs.id = g.grade_status_id
        GROUP BY
          ss.student_id,
          ss.programme_acronym,
          ss.academic_level_number
      ),
      incident_scope AS (
        SELECT
          ss.student_id,
          ss.programme_acronym,
          ss.academic_level_number,
          COUNT(DISTINCT i.id) AS open_incidents,
          COUNT(DISTINCT CASE WHEN i.severity = 'HIGH' THEN i.id END) AS high_open_incidents
        FROM student_scope ss
        LEFT JOIN incidents i
          ON i.student_id = ss.student_id
          AND i.academic_year_id = ss.academic_year_id
          AND i.centre_id = ss.centre_id
          AND i.deleted_at IS NULL
          AND i.resolved_at IS NULL
        GROUP BY
          ss.student_id,
          ss.programme_acronym,
          ss.academic_level_number
      )
      SELECT
        ss.student_id,
        MAX(ss.student_code) AS student_code,
        MAX(ss.student_full_name) AS student_full_name,
        ss.programme_acronym,
        ss.academic_level_number,
        COALESCE(MAX(gs.enrolled_modules), 0) AS enrolled_modules,
        COALESCE(MAX(gs.evaluation_count), 0) AS evaluation_count,
        COALESCE(MAX(gs.expected_grade_records), 0) AS expected_grade_records,
        COALESCE(MAX(gs.grade_records), 0) AS grade_records,
        COALESCE(MAX(gs.numeric_grades), 0) AS numeric_grades,
        COALESCE(MAX(gs.passed_grades), 0) AS passed_grades,
        COALESCE(MAX(gs.failed_grades), 0) AS failed_grades,
        COALESCE(MAX(gs.non_evaluable_states), 0) AS non_evaluable_states,
        COALESCE(MAX(ins.open_incidents), 0) AS open_incidents,
        COALESCE(MAX(ins.high_open_incidents), 0) AS high_open_incidents
      FROM student_scope ss
      LEFT JOIN grade_scope gs
        ON gs.student_id = ss.student_id
        AND gs.programme_acronym = ss.programme_acronym
        AND gs.academic_level_number = ss.academic_level_number
      LEFT JOIN incident_scope ins
        ON ins.student_id = ss.student_id
        AND ins.programme_acronym = ss.programme_acronym
        AND ins.academic_level_number = ss.academic_level_number
      GROUP BY
        ss.student_id,
        ss.programme_acronym,
        ss.academic_level_number
      ORDER BY
        high_open_incidents DESC,
        open_incidents DESC,
        failed_grades DESC,
        non_evaluable_states DESC,
        expected_grade_records - grade_records DESC,
        student_full_name ASC
      LIMIT 60
    `,
    ...values,
  );

  const moduleRows = await prisma.$queryRawUnsafe<ModuleRiskRow[]>(
    `
      WITH module_scope AS (
        SELECT DISTINCT
          en.id AS enrolment_id,
          en.student_id,
          ay.id AS academic_year_id,
          en.centre_id,
          vp.acronym AS programme_acronym,
          al.number AS academic_level_number,
          m.id AS module_id,
          m.code AS module_code,
          m.name AS module_name,
          m.sort_order
        FROM enrolments en
        INNER JOIN students s ON s.id = en.student_id
        INNER JOIN academic_years ay ON ay.id = en.academic_year_id
        INNER JOIN modules m ON m.id = en.module_id
        INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
        INNER JOIN academic_levels al ON al.id = m.academic_level_id
        ${whereSql}
      ),
      evaluation_scope AS (
        SELECT DISTINCT
          e.id AS evaluation_id,
          e.academic_year_id,
          e.centre_id
        FROM evaluations e
        WHERE e.deleted_at IS NULL
      )
      SELECT
        ms.programme_acronym,
        ms.academic_level_number,
        ms.module_code,
        ms.module_name,
        COUNT(DISTINCT ms.student_id) AS enrolled_students,
        COUNT(DISTINCT CONCAT(ms.enrolment_id, '-', es.evaluation_id)) AS expected_grade_records,
        COUNT(DISTINCT g.id) AS grade_records,
        COUNT(DISTINCT CASE
          WHEN g.id IS NOT NULL
            AND (
              g.is_passed = TRUE
              OR COALESCE(g.final_grade, g.numeric_grade) >= 5
            )
          THEN g.id
        END) AS passed_grades,
        COUNT(DISTINCT CASE
          WHEN g.id IS NOT NULL
            AND COALESCE(g.final_grade, g.numeric_grade) IS NOT NULL
            AND NOT (
              g.is_passed = TRUE
              OR COALESCE(g.final_grade, g.numeric_grade) >= 5
            )
          THEN g.id
        END) AS failed_grades,
        COUNT(DISTINCT CASE
          WHEN g.id IS NOT NULL
            AND gs.id IS NOT NULL
            AND COALESCE(gs.is_evaluable, FALSE) = FALSE
          THEN g.id
        END) AS non_evaluable_states,
        COUNT(DISTINCT CASE
          WHEN i.id IS NOT NULL
            AND i.resolved_at IS NULL
          THEN i.id
        END) AS open_incidents
      FROM module_scope ms
      LEFT JOIN evaluation_scope es
        ON es.academic_year_id = ms.academic_year_id
        AND es.centre_id = ms.centre_id
      LEFT JOIN grades g
        ON g.enrolment_id = ms.enrolment_id
        AND g.evaluation_id = es.evaluation_id
        AND g.deleted_at IS NULL
      LEFT JOIN grade_statuses gs ON gs.id = g.grade_status_id
      LEFT JOIN incidents i
        ON i.student_id = ms.student_id
        AND i.academic_year_id = ms.academic_year_id
        AND i.centre_id = ms.centre_id
        AND (
          i.module_id IS NULL
          OR i.module_id = ms.module_id
        )
        AND i.deleted_at IS NULL
      GROUP BY
        ms.programme_acronym,
        ms.academic_level_number,
        ms.module_code,
        ms.module_name,
        ms.sort_order
      ORDER BY
        failed_grades DESC,
        non_evaluable_states DESC,
        expected_grade_records - grade_records DESC,
        open_incidents DESC,
        ms.programme_acronym ASC,
        ms.academic_level_number ASC,
        ms.sort_order ASC
      LIMIT 40
    `,
    ...values,
  );

  const students = studentRows.map((row) => {
    const expectedGradeRecords = toNumber(row.expected_grade_records);
    const gradeRecords = toNumber(row.grade_records);
    const missingGradeRecords = Math.max(
      expectedGradeRecords - gradeRecords,
      0,
    );

    const failedGrades = toNumber(row.failed_grades);
    const nonEvaluableStates = toNumber(row.non_evaluable_states);
    const openIncidents = toNumber(row.open_incidents);
    const highOpenIncidents = toNumber(row.high_open_incidents);

    const riskScore =
      Math.min(missingGradeRecords, 3)
      + failedGrades * 2
      + nonEvaluableStates
      + openIncidents
      + highOpenIncidents * 2;

    return {
      studentId: toNumber(row.student_id),
      studentCode: row.student_code,
      student: row.student_full_name,
      programme: row.programme_acronym,
      academicLevel: toNumber(row.academic_level_number),
      enrolledModules: toNumber(row.enrolled_modules),
      evaluationCount: toNumber(row.evaluation_count),
      expectedGradeRecords,
      gradeRecords,
      missingGradeRecords,
      numericGrades: toNumber(row.numeric_grades),
      passedGrades: toNumber(row.passed_grades),
      failedGrades,
      nonEvaluableStates,
      openIncidents,
      highOpenIncidents,
      riskScore,
      riskLevel: getRiskLevel(riskScore),
      riskReasons: getRiskReasons({
        missingGradeRecords,
        failedGrades,
        nonEvaluableStates,
        openIncidents,
        highOpenIncidents,
      }),
    };
  });

  const modules = moduleRows.map((row) => {
    const expectedGradeRecords = toNumber(row.expected_grade_records);
    const gradeRecords = toNumber(row.grade_records);
    const passedGrades = toNumber(row.passed_grades);

    return {
      programme: row.programme_acronym,
      academicLevel: toNumber(row.academic_level_number),
      module: {
        code: row.module_code,
        name: row.module_name,
      },
      enrolledStudents: toNumber(row.enrolled_students),
      expectedGradeRecords,
      gradeRecords,
      missingGradeRecords: Math.max(
        expectedGradeRecords - gradeRecords,
        0,
      ),
      passedGrades,
      failedGrades: toNumber(row.failed_grades),
      nonEvaluableStates: toNumber(row.non_evaluable_states),
      openIncidents: toNumber(row.open_incidents),
      performanceRate: expectedGradeRecords > 0
        ? roundPercentage((passedGrades / expectedGradeRecords) * 100)
        : null,
    };
  });

  const totals = students.reduce(
    (accumulator, item) => ({
      students: accumulator.students + 1,
      highRiskStudents:
        accumulator.highRiskStudents + (item.riskLevel === 'HIGH' ? 1 : 0),
      mediumRiskStudents:
        accumulator.mediumRiskStudents + (item.riskLevel === 'MEDIUM' ? 1 : 0),
      lowRiskStudents:
        accumulator.lowRiskStudents + (item.riskLevel === 'LOW' ? 1 : 0),
      missingGradeRecords:
        accumulator.missingGradeRecords + item.missingGradeRecords,
      failedGrades:
        accumulator.failedGrades + item.failedGrades,
      nonEvaluableStates:
        accumulator.nonEvaluableStates + item.nonEvaluableStates,
      openIncidents:
        accumulator.openIncidents + item.openIncidents,
      highOpenIncidents:
        accumulator.highOpenIncidents + item.highOpenIncidents,
    }),
    {
      students: 0,
      highRiskStudents: 0,
      mediumRiskStudents: 0,
      lowRiskStudents: 0,
      missingGradeRecords: 0,
      failedGrades: 0,
      nonEvaluableStates: 0,
      openIncidents: 0,
      highOpenIncidents: 0,
    },
  );

  const warnings: string[] = [
    'El riesgo académico se calcula solo con indicadores registrados: calificaciones, estados de nota e incidencias abiertas. No se usa asistencia porque SAFA Twin se está modelando para formación online.',
  ];

  if (students.length === 0) {
    warnings.unshift(
      'No se han encontrado alumnos matriculados con los filtros interpretados.',
    );
  }

  return {
    kind: 'academic-followup',
    title: 'Seguimiento académico online',
    summary:
      `Se han analizado ${totals.students} alumnos matriculados. `
      + `Hay ${totals.highRiskStudents} en riesgo alto y ${totals.mediumRiskStudents} en riesgo medio según los datos disponibles.`,
    warnings,
    data: {
      filters: intent,
      totals,
      students,
      modules,
      riskCriteria: {
        missingGradeRecord: 'Calificación esperada sin registro.',
        failedGrade: 'Calificación numérica inferior a 5 o marcada como no superada.',
        nonEvaluableState: 'Estado de nota no evaluable o no ordinario según grade_statuses.is_evaluable = false.',
        openIncident: 'Incidencia académica abierta sin resolved_at.',
        highOpenIncident: 'Incidencia académica abierta con severity = HIGH.',
      },
    },
  };
}
