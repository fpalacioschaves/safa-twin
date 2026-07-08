import { prisma } from '../../config/database.js';

import type {
  AttendanceSummaryQuery,
  CreateAttendanceRecordInput,
  ListAttendanceRecordsQuery,
  UpdateAttendanceRecordInput,
} from './attendance.schemas.js';

type NumberLike = bigint | number | string | null;

type DateLike = Date | string | null;

interface AttendanceRecordRow {
  id: NumberLike;
  student_id: NumberLike;
  student_code: string | null;
  student_full_name: string;
  academic_year_id: NumberLike;
  academic_year_name: string;
  centre_id: NumberLike;
  centre_name: string;
  module_id: NumberLike;
  module_code: string;
  module_name: string;
  vocational_programme_id: NumberLike;
  vocational_programme_acronym: string;
  academic_level_id: NumberLike;
  academic_level_number: NumberLike;
  created_by_user_id: NumberLike;
  created_by_user_name: string | null;
  recorded_at: DateLike;
  type: string;
  minutes: NumberLike;
  is_justified: NumberLike;
  session_label: string | null;
  remarks: string | null;
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

export class AttendanceRecordNotFoundError extends Error {
  public constructor() {
    super('El registro de asistencia solicitado no existe.');
    this.name = 'AttendanceRecordNotFoundError';
  }
}

export class AttendanceRecordArchivedError extends Error {
  public constructor() {
    super('El registro de asistencia está archivado y no puede modificarse.');
    this.name = 'AttendanceRecordArchivedError';
  }
}

export class AttendanceRecordAlreadyArchivedError extends Error {
  public constructor() {
    super('El registro de asistencia ya está archivado.');
    this.name = 'AttendanceRecordAlreadyArchivedError';
  }
}

export class AttendanceRelatedEntityUnavailableError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'AttendanceRelatedEntityUnavailableError';
  }
}

function toNumber(value: NumberLike): number {
  if (value === null) {
    return 0;
  }

  return Number(value);
}

function toBoolean(value: NumberLike): boolean {
  return toNumber(value) === 1;
}

function toDateOnly(value: DateLike): string | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
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
  value: string | undefined,
): string | null {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

function mapAttendanceRecord(row: AttendanceRecordRow) {
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
    module: {
      id: toNumber(row.module_id),
      code: row.module_code,
      name: row.module_name,
    },
    vocationalProgramme: {
      id: toNumber(row.vocational_programme_id),
      acronym: row.vocational_programme_acronym,
    },
    academicLevel: {
      id: toNumber(row.academic_level_id),
      number: toNumber(row.academic_level_number),
    },
    createdByUser: row.created_by_user_id === null
      ? null
      : {
          id: toNumber(row.created_by_user_id),
          name: row.created_by_user_name,
        },
    recordedAt: toDateOnly(row.recorded_at),
    type: row.type,
    minutes: row.minutes === null
      ? null
      : toNumber(row.minutes),
    isJustified: toBoolean(row.is_justified),
    sessionLabel: row.session_label,
    remarks: row.remarks,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toIsoString(row.deleted_at),
  };
}

function getBaseAttendanceSelectSql(): string {
  return `
    SELECT
      ar.id,
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
      ar.recorded_at,
      ar.type,
      ar.minutes,
      ar.is_justified,
      ar.session_label,
      ar.remarks,
      ar.created_at,
      ar.updated_at,
      ar.deleted_at
    FROM attendance_records ar
    INNER JOIN students s ON s.id = ar.student_id
    INNER JOIN academic_years ay ON ay.id = ar.academic_year_id
    INNER JOIN centres c ON c.id = ar.centre_id
    INNER JOIN modules m ON m.id = ar.module_id
    INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
    INNER JOIN academic_levels al ON al.id = m.academic_level_id
    LEFT JOIN users u ON u.id = ar.created_by_user_id
  `;
}

function addCommonFilters(
  clauses: string[],
  values: unknown[],
  query: AttendanceSummaryQuery | ListAttendanceRecordsQuery,
): void {
  clauses.push('ar.deleted_at IS NULL');

  if (query.academicYearId !== undefined) {
    clauses.push('ar.academic_year_id = ?');
    values.push(query.academicYearId);
  }

  if (query.centreId !== undefined) {
    clauses.push('ar.centre_id = ?');
    values.push(query.centreId);
  }

  if (query.moduleId !== undefined) {
    clauses.push('ar.module_id = ?');
    values.push(query.moduleId);
  }

  if (query.studentId !== undefined) {
    clauses.push('ar.student_id = ?');
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
    clauses.push('ar.type = ?');
    values.push(query.type);
  }

  if (query.justification === 'justified') {
    clauses.push('ar.is_justified = TRUE');
  }

  if (query.justification === 'unjustified') {
    clauses.push('ar.is_justified = FALSE');
  }

  if (query.dateFrom !== undefined) {
    clauses.push('ar.recorded_at >= ?');
    values.push(query.dateFrom);
  }

  if (query.dateTo !== undefined) {
    clauses.push('ar.recorded_at <= ?');
    values.push(query.dateTo);
  }
}

function getWhereSql(clauses: string[]): string {
  return clauses.length === 0
    ? ''
    : `WHERE ${clauses.join(' AND ')}`;
}

async function ensureAttendanceScopeExists(
  input: {
    studentId: number;
    academicYearId: number;
    centreId: number;
    moduleId: number;
  },
): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(
    `
      SELECT COUNT(*) AS total
      FROM enrolments en
      INNER JOIN students s ON s.id = en.student_id
      INNER JOIN academic_years ay ON ay.id = en.academic_year_id
      INNER JOIN centres c ON c.id = en.centre_id
      INNER JOIN modules m ON m.id = en.module_id
      WHERE en.student_id = ?
        AND en.academic_year_id = ?
        AND en.centre_id = ?
        AND en.module_id = ?
        AND en.status = 'ENROLLED'
        AND en.deleted_at IS NULL
        AND s.deleted_at IS NULL
        AND ay.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND m.deleted_at IS NULL
    `,
    input.studentId,
    input.academicYearId,
    input.centreId,
    input.moduleId,
  );

  if (toNumber(rows[0]?.total ?? 0) === 0) {
    throw new AttendanceRelatedEntityUnavailableError(
      'No existe una matrícula activa que relacione ese alumno, curso académico, centro y módulo.',
    );
  }
}

export async function listAttendanceRecords(
  query: ListAttendanceRecordsQuery,
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
      OR ar.session_label LIKE ?
      OR ar.remarks LIKE ?
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
    );
  }

  const whereSql = getWhereSql(clauses);
  const skip = (query.page - 1) * query.pageSize;

  const countRows = await prisma.$queryRawUnsafe<CountRow[]>(
    `
      SELECT COUNT(DISTINCT ar.id) AS total
      FROM attendance_records ar
      INNER JOIN students s ON s.id = ar.student_id
      INNER JOIN modules m ON m.id = ar.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${whereSql}
    `,
    ...values,
  );

  const rows = await prisma.$queryRawUnsafe<AttendanceRecordRow[]>(
    `
      ${getBaseAttendanceSelectSql()}
      ${whereSql}
      ORDER BY
        ar.recorded_at DESC,
        s.last_name_1 ASC,
        s.last_name_2 ASC,
        s.first_name ASC,
        ar.id DESC
      LIMIT ? OFFSET ?
    `,
    ...values,
    query.pageSize,
    skip,
  );

  const total = toNumber(countRows[0]?.total ?? 0);

  return {
    items: rows.map(mapAttendanceRecord),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function getAttendanceRecordById(
  attendanceRecordId: number,
) {
  const rows = await prisma.$queryRawUnsafe<AttendanceRecordRow[]>(
    `
      ${getBaseAttendanceSelectSql()}
      WHERE ar.id = ?
      LIMIT 1
    `,
    attendanceRecordId,
  );

  const record = rows[0];

  if (!record) {
    throw new AttendanceRecordNotFoundError();
  }

  return mapAttendanceRecord(record);
}

export async function createAttendanceRecord(
  input: CreateAttendanceRecordInput,
  createdByUserId: number | null,
) {
  await ensureAttendanceScopeExists(input);

  const result = await prisma.$executeRawUnsafe(
    `
      INSERT INTO attendance_records (
        student_id,
        academic_year_id,
        centre_id,
        module_id,
        created_by_user_id,
        recorded_at,
        type,
        minutes,
        is_justified,
        session_label,
        remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    input.studentId,
    input.academicYearId,
    input.centreId,
    input.moduleId,
    createdByUserId,
    input.recordedAt,
    input.type,
    input.minutes ?? null,
    input.isJustified,
    normalizeOptionalText(input.sessionLabel),
    normalizeOptionalText(input.remarks),
  );

  if (result !== 1) {
    throw new Error(
      'No se pudo crear el registro de asistencia.',
    );
  }

  const insertedRows = await prisma.$queryRawUnsafe<{
    id: NumberLike;
  }[]>(
    'SELECT LAST_INSERT_ID() AS id',
  );

  return await getAttendanceRecordById(
    toNumber(insertedRows[0]?.id ?? 0),
  );
}

export async function updateAttendanceRecord(
  attendanceRecordId: number,
  input: UpdateAttendanceRecordInput,
) {
  const existingRecord = await getAttendanceRecordById(
    attendanceRecordId,
  );

  if (existingRecord.deletedAt !== null) {
    throw new AttendanceRecordArchivedError();
  }

  await ensureAttendanceScopeExists(input);

  await prisma.$executeRawUnsafe(
    `
      UPDATE attendance_records
      SET
        student_id = ?,
        academic_year_id = ?,
        centre_id = ?,
        module_id = ?,
        recorded_at = ?,
        type = ?,
        minutes = ?,
        is_justified = ?,
        session_label = ?,
        remarks = ?
      WHERE id = ?
        AND deleted_at IS NULL
    `,
    input.studentId,
    input.academicYearId,
    input.centreId,
    input.moduleId,
    input.recordedAt,
    input.type,
    input.minutes ?? null,
    input.isJustified,
    normalizeOptionalText(input.sessionLabel),
    normalizeOptionalText(input.remarks),
    attendanceRecordId,
  );

  return await getAttendanceRecordById(attendanceRecordId);
}

export async function archiveAttendanceRecord(
  attendanceRecordId: number,
) {
  const existingRecord = await getAttendanceRecordById(
    attendanceRecordId,
  );

  if (existingRecord.deletedAt !== null) {
    throw new AttendanceRecordAlreadyArchivedError();
  }

  await prisma.$executeRawUnsafe(
    `
      UPDATE attendance_records
      SET deleted_at = CURRENT_TIMESTAMP(0)
      WHERE id = ?
        AND deleted_at IS NULL
    `,
    attendanceRecordId,
  );

  return {
    archived: true,
  };
}

export async function getAttendanceSummary(
  query: AttendanceSummaryQuery,
) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  addCommonFilters(clauses, values, query);

  const whereSql = getWhereSql(clauses);

  const rows = await prisma.$queryRawUnsafe<SummaryRow[]>(
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
      INNER JOIN modules m ON m.id = ar.module_id
      INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
      INNER JOIN academic_levels al ON al.id = m.academic_level_id
      ${whereSql}
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
      LIMIT 200
    `,
    ...values,
  );

  const items = rows.map((row) => ({
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

  return {
    items,
    totals: items.reduce(
      (totals, item) => ({
        totalRecords: totals.totalRecords + item.totalRecords,
        affectedStudents: Math.max(
          totals.affectedStudents,
          item.affectedStudents,
        ),
        absences: totals.absences + item.absences,
        delays: totals.delays + item.delays,
        earlyDepartures:
          totals.earlyDepartures + item.earlyDepartures,
        justified: totals.justified + item.justified,
        unjustified: totals.unjustified + item.unjustified,
        totalMinutes: totals.totalMinutes + item.totalMinutes,
      }),
      {
        totalRecords: 0,
        affectedStudents: 0,
        absences: 0,
        delays: 0,
        earlyDepartures: 0,
        justified: 0,
        unjustified: 0,
        totalMinutes: 0,
      },
    ),
    warnings: [
      'El resumen cuenta registros y minutos, pero no calcula porcentaje de absentismo horario porque aún no existe una tabla de calendario/horario lectivo por módulo.',
    ],
  };
}
