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

interface StudentSummaryRow {
  programme_acronym: string;
  academic_level_number: NumberLike;
  students: NumberLike;
  with_email: NumberLike;
  without_email: NumberLike;
  with_phone: NumberLike;
  without_phone: NumberLike;
}

interface StudentPreviewRow {
  id: NumberLike;
  full_name: string;
  email: string | null;
  phone: string | null;
  programme_acronym: string;
  academic_level_number: NumberLike;
}

export async function getStudentsContext(
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

  const summaryRows = await prisma.$queryRawUnsafe<StudentSummaryRow[]>(
    `
      SELECT
        vp.acronym AS programme_acronym,
        al.number AS academic_level_number,
        COUNT(DISTINCT s.id) AS students,
        COUNT(DISTINCT CASE WHEN s.email IS NOT NULL AND s.email <> '' THEN s.id END) AS with_email,
        COUNT(DISTINCT CASE WHEN s.email IS NULL OR s.email = '' THEN s.id END) AS without_email,
        COUNT(DISTINCT CASE WHEN s.phone IS NOT NULL AND s.phone <> '' THEN s.id END) AS with_phone,
        COUNT(DISTINCT CASE WHEN s.phone IS NULL OR s.phone = '' THEN s.id END) AS without_phone
      FROM students s
      INNER JOIN enrolments en ON en.student_id = s.id
      INNER JOIN academic_years ay ON ay.id = en.academic_year_id
      INNER JOIN modules m ON m.id = en.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${whereSql}
      GROUP BY
        vp.acronym,
        al.number
      ORDER BY
        vp.acronym ASC,
        al.number ASC
      LIMIT 50
    `,
    ...values,
  );

  const previewRows = await prisma.$queryRawUnsafe<StudentPreviewRow[]>(
    `
      SELECT DISTINCT
        s.id,
        CONCAT(
          s.first_name,
          ' ',
          s.last_name_1,
          COALESCE(CONCAT(' ', s.last_name_2), '')
        ) AS full_name,
        s.email,
        s.phone,
        vp.acronym AS programme_acronym,
        al.number AS academic_level_number
      FROM students s
      INNER JOIN enrolments en ON en.student_id = s.id
      INNER JOIN academic_years ay ON ay.id = en.academic_year_id
      INNER JOIN modules m ON m.id = en.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${whereSql}
      ORDER BY
        vp.acronym ASC,
        al.number ASC,
        s.last_name_1 ASC,
        s.last_name_2 ASC,
        s.first_name ASC
      LIMIT 50
    `,
    ...values,
  );

  const summary = summaryRows.map((row) => ({
    programme: row.programme_acronym,
    academicLevel: toNumber(row.academic_level_number),
    students: toNumber(row.students),
    withEmail: toNumber(row.with_email),
    withoutEmail: toNumber(row.without_email),
    withPhone: toNumber(row.with_phone),
    withoutPhone: toNumber(row.without_phone),
  }));

  const preview = previewRows.map((row) => ({
    id: toNumber(row.id),
    name: row.full_name,
    email: row.email,
    phone: row.phone,
    programme: row.programme_acronym,
    academicLevel: toNumber(row.academic_level_number),
  }));

  const totalStudents = summary.reduce(
    (total, item) => total + item.students,
    0,
  );

  const warnings = totalStudents === 0
    ? [
      'No se han encontrado alumnos activos matriculados en el curso actual con los filtros interpretados.',
    ]
    : [];

  return {
    kind: 'students-summary',
    title: 'Resumen de alumnado',
    summary:
      `Se han localizado ${totalStudents} alumnos activos matriculados en el curso actual.`,
    warnings,
    data: {
      filters: intent,
      summary,
      preview,
    },
  };
}
