import { prisma } from '../../../config/database.js';

import type {
  DigitalTwinIntent,
} from '../digital-twin.schemas.js';

import type {
  DigitalTwinContext,
  NumberLike,
} from '../digital-twin.types.js';

import {
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
        'Para activar informes reales de absentismo hay que implementar primero el módulo de asistencia.',
      ],
      data: {
        filters: intent,
        readiness: {
          attendanceRecordsTableExists: attendanceTableExists,
          academicIncidentsTableExists: academicIncidentTableExists,
          currentCourseStudents: enrolmentScope.students,
          currentCourseEnrolments: enrolmentScope.enrolments,
        },
        requiredNextStep: {
          table: 'attendance_records',
          minimumFields: [
            'id',
            'student_id',
            'academic_year_id',
            'centre_id',
            'module_id',
            'recorded_at',
            'type',
            'minutes',
            'is_justified',
            'remarks',
            'created_at',
            'updated_at',
            'deleted_at',
          ],
        },
      },
    };
  }

  return {
    kind: 'attendance-summary',
    title: 'Resumen de asistencia',
    summary:
      'La tabla de asistencia existe, pero esta versión del Gemelo Digital aún no tiene activada la consulta detallada de sus registros.',
    warnings: [
      'Se ha detectado attendance_records, pero falta conectar el esquema concreto de la tabla con la herramienta de absentismo.',
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
