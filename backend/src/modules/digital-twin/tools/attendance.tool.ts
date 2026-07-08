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

interface TableStatusRow {
  table_name: string;
  total: NumberLike;
}

interface EnrolmentScopeRow {
  students: NumberLike;
  enrolments: NumberLike;
}

interface AttendanceSummaryRow {
  programme_acronym: string;
  academic_level_number: NumberLike;
  module_code: string;
  module_name: string;
  total_records: NumberLike;
  affected_students: NumberLike;
  absences: NumberLike;
  delays: NumberLike;
  early_departures: NumberLike;
  justified: NumberLike;
  unjustified: NumberLike;
  total_minutes: NumberLike;
}

interface AttendanceStudentRiskRow {
  student_id: NumberLike;
  student_full_name: string;
  programme_acronym: string;
  academic_level_number: NumberLike;
  total_records: NumberLike;
  absences: NumberLike;
  unjustified: NumberLike;
  total_minutes: NumberLike;
}

async function checkTableExists(
  tableName: string,
): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<TableStatusRow[]>(
    `
      SELECT TABLE_NAME AS table_name, COUNT(*) AS total
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      GROUP BY TABLE_NAME
    `,
    tableName,
  );

  return rows.length > 0 && toNumber(rows[0]?.total ?? 0) > 0;
}

async function getCurrentEnrolmentScope(): Promise<{
  students: number;
  enrolments: number;
}> {
  const rows = await prisma.$queryRawUnsafe<EnrolmentScopeRow[]>(
    `
      SELECT
        COUNT(DISTINCT en.student_id) AS students,
        COUNT(DISTINCT en.id) AS enrolments
      FROM enrolments en
      INNER JOIN academic_years ay ON ay.id = en.academic_year_id
      WHERE ay.is_current = TRUE
        AND en.deleted_at IS NULL
        AND en.status = 'ENROLLED'
    `,
  );

  return {
    students: toNumber(rows[0]?.students ?? 0),
    enrolments: toNumber(rows[0]?.enrolments ?? 0),
  };
}

function buildScope(
  intent: DigitalTwinIntent,
): {
  clauses: string[];
  values: unknown[];
} {
  const clauses = [
    'ay.is_current = TRUE',
    'ar.deleted_at IS NULL',
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

async function getAttendanceSummaryRows(
  intent: DigitalTwinIntent,
): Promise<AttendanceSummaryRow[]> {
  const scope = buildScope(intent);

  return await prisma.$queryRawUnsafe<AttendanceSummaryRow[]>(
    `
      SELECT
        vp.acronym AS programme_acronym,
        al.number AS academic_level_number,
        m.code AS module_code,
        m.name AS module_name,
        COUNT(DISTINCT ar.id) AS total_records,
        COUNT(DISTINCT ar.student_id) AS affected_students,
        SUM(CASE WHEN ar.type = 'ABSENCE' THEN 1 ELSE 0 END) AS absences,
        SUM(CASE WHEN ar.type = 'DELAY' THEN 1 ELSE 0 END) AS delays,
        SUM(CASE WHEN ar.type = 'EARLY_DEPARTURE' THEN 1 ELSE 0 END) AS early_departures,
        SUM(CASE WHEN ar.is_justified = TRUE THEN 1 ELSE 0 END) AS justified,
        SUM(CASE WHEN ar.is_justified = FALSE THEN 1 ELSE 0 END) AS unjustified,
        SUM(COALESCE(ar.minutes, 0)) AS total_minutes
      FROM attendance_records ar
      INNER JOIN academic_years ay ON ay.id = ar.academic_year_id
      INNER JOIN modules m ON m.id = ar.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${getWhereSql(scope.clauses)}
      GROUP BY
        vp.acronym,
        al.number,
        m.code,
        m.name,
        m.sort_order
      ORDER BY
        vp.acronym ASC,
        al.number ASC,
        m.sort_order ASC,
        m.name ASC
      LIMIT 120
    `,
    ...scope.values,
  );
}

async function getStudentRiskRows(
  intent: DigitalTwinIntent,
): Promise<AttendanceStudentRiskRow[]> {
  const scope = buildScope(intent);

  return await prisma.$queryRawUnsafe<AttendanceStudentRiskRow[]>(
    `
      SELECT
        s.id AS student_id,
        CONCAT(
          s.first_name,
          ' ',
          s.last_name_1,
          COALESCE(CONCAT(' ', s.last_name_2), '')
        ) AS student_full_name,
        vp.acronym AS programme_acronym,
        al.number AS academic_level_number,
        COUNT(DISTINCT ar.id) AS total_records,
        SUM(CASE WHEN ar.type = 'ABSENCE' THEN 1 ELSE 0 END) AS absences,
        SUM(CASE WHEN ar.is_justified = FALSE THEN 1 ELSE 0 END) AS unjustified,
        SUM(COALESCE(ar.minutes, 0)) AS total_minutes
      FROM attendance_records ar
      INNER JOIN students s ON s.id = ar.student_id
      INNER JOIN academic_years ay ON ay.id = ar.academic_year_id
      INNER JOIN modules m ON m.id = ar.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${getWhereSql(scope.clauses)}
      GROUP BY
        s.id,
        s.first_name,
        s.last_name_1,
        s.last_name_2,
        vp.acronym,
        al.number
      ORDER BY
        unjustified DESC,
        absences DESC,
        total_minutes DESC,
        s.last_name_1 ASC,
        s.last_name_2 ASC,
        s.first_name ASC
      LIMIT 25
    `,
    ...scope.values,
  );
}

export async function getAttendanceContext(
  intent: DigitalTwinIntent,
): Promise<DigitalTwinContext> {
  const attendanceTableExists = await checkTableExists(
    'attendance_records',
  );

  const academicIncidentTableExists = await checkTableExists(
    'incidents',
  );

  const enrolmentScope = await getCurrentEnrolmentScope();

  if (!attendanceTableExists) {
    return {
      kind: 'attendance-summary',
      title: 'Informe de asistencia no disponible',
      summary:
        'SAFA Twin todavía no tiene implementada una tabla de registros de asistencia, por lo que no puede calcular absentismo real.',
      warnings: [
        'No existe la tabla attendance_records en la base de datos actual.',
        'No se han inventado faltas, porcentajes ni alumnos absentistas.',
        'Ejecuta las migraciones para activar el módulo real de asistencia.',
      ],
      data: {
        filters: intent,
        readiness: {
          attendanceRecordsTableExists: attendanceTableExists,
          academicIncidentsTableExists: academicIncidentTableExists,
          currentCourseStudents: enrolmentScope.students,
          currentCourseEnrolments: enrolmentScope.enrolments,
        },
      },
    };
  }

  const summaryRows = await getAttendanceSummaryRows(intent);
  const studentRiskRows = await getStudentRiskRows(intent);

  const items = summaryRows.map((row) => ({
    programme: row.programme_acronym,
    academicLevel: toNumber(row.academic_level_number),
    module: {
      code: row.module_code,
      name: row.module_name,
    },
    totalRecords: toNumber(row.total_records),
    affectedStudents: toNumber(row.affected_students),
    absences: toNumber(row.absences),
    delays: toNumber(row.delays),
    earlyDepartures: toNumber(row.early_departures),
    justified: toNumber(row.justified),
    unjustified: toNumber(row.unjustified),
    totalMinutes: toNumber(row.total_minutes),
  }));

  const studentsAtRisk = studentRiskRows.map((row) => ({
    studentId: toNumber(row.student_id),
    student: row.student_full_name,
    programme: row.programme_acronym,
    academicLevel: toNumber(row.academic_level_number),
    totalRecords: toNumber(row.total_records),
    absences: toNumber(row.absences),
    unjustified: toNumber(row.unjustified),
    totalMinutes: toNumber(row.total_minutes),
  }));

  const totals = items.reduce(
    (accumulator, item) => ({
      totalRecords: accumulator.totalRecords + item.totalRecords,
      absences: accumulator.absences + item.absences,
      delays: accumulator.delays + item.delays,
      earlyDepartures:
        accumulator.earlyDepartures + item.earlyDepartures,
      justified: accumulator.justified + item.justified,
      unjustified: accumulator.unjustified + item.unjustified,
      totalMinutes: accumulator.totalMinutes + item.totalMinutes,
    }),
    {
      totalRecords: 0,
      absences: 0,
      delays: 0,
      earlyDepartures: 0,
      justified: 0,
      unjustified: 0,
      totalMinutes: 0,
    },
  );

  const warnings = [
    'El resumen cuenta registros y minutos, pero no calcula porcentaje de absentismo horario porque aún no existe una tabla de calendario/horario lectivo por módulo.',
  ];

  if (items.length === 0) {
    warnings.unshift(
      'No se han encontrado registros de asistencia con los filtros interpretados.',
    );
  }

  return {
    kind: 'attendance-summary',
    title: 'Resumen de asistencia',
    summary:
      `Se han localizado ${totals.totalRecords} registros de asistencia con los filtros interpretados.`,
    warnings,
    data: {
      filters: intent,
      readiness: {
        attendanceRecordsTableExists: attendanceTableExists,
        academicIncidentsTableExists: academicIncidentTableExists,
        currentCourseStudents: enrolmentScope.students,
        currentCourseEnrolments: enrolmentScope.enrolments,
      },
      totals,
      items,
      studentsAtRisk,
    },
  };
}
