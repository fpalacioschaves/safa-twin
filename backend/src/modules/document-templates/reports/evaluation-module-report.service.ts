import { prisma } from '../../../config/database.js';
import type {
  DocumentOutputFormat,
} from '../document-template.types.js';

export interface EvaluationModuleReportContext {
  evaluationId: number;
  moduleId: number;
}

export interface EvaluationModuleReportSummary {
  enrolled: number;
  graded: number;
  evaluated: number;
  passed: number;
  failed: number;
  notEvaluated: number;
  successRate: number;
  performanceRate: number;
  averageGrade: number | null;
}

export interface EvaluationModuleReportStudentRow {
  studentId: number;
  studentCode: string;
  studentName: string;
  enrolmentStatus: string;
  numericGrade: number | null;
  finalGrade: number | null;
  statusCode: string;
  statusName: string;
  isEvaluable: boolean;
  isPassed: boolean | null;
  remarks: string;
}

export interface EvaluationModuleReportStatusRow {
  statusCode: string;
  statusName: string;
  total: number;
}

export interface EvaluationModuleReportModel {
  title: string;
  generatedAt: Date;
  outputFormat: DocumentOutputFormat;
  context: EvaluationModuleReportContext;
  academicYear: {
    id: number;
    name: string;
  };
  centre: {
    id: number;
    name: string;
    shortName: string;
  };
  evaluation: {
    id: number;
    code: string;
    name: string;
    status: string;
    startsAt: string;
    endsAt: string;
  };
  module: {
    id: number;
    code: string;
    name: string;
    acronym: string;
    programmeId: number;
    programmeName: string;
    programmeAcronym: string;
    levelId: number;
    levelName: string;
  };
  summary: EvaluationModuleReportSummary;
  statusSummary: EvaluationModuleReportStatusRow[];
  students: EvaluationModuleReportStudentRow[];
  warnings: string[];
}

interface EvaluationModuleHeaderRow {
  evaluation_id: bigint | number;
  evaluation_code: string;
  evaluation_name: string;
  evaluation_status: string;
  evaluation_starts_at: Date | string | null;
  evaluation_ends_at: Date | string | null;
  academic_year_id: bigint | number;
  academic_year_name: string;
  centre_id: bigint | number;
  centre_name: string;
  centre_short_name: string | null;
  module_id: bigint | number;
  module_code: string;
  module_name: string;
  module_acronym: string | null;
  programme_id: bigint | number;
  programme_name: string;
  programme_acronym: string;
  level_id: bigint | number;
  level_name: string;
}

interface EvaluationModuleStudentRowDb {
  student_id: bigint | number;
  student_code: string | null;
  first_name: string;
  last_name_1: string;
  last_name_2: string | null;
  enrolment_status: string;
  numeric_grade: string | number | null;
  final_grade: string | number | null;
  is_passed: boolean | number | null;
  grade_remarks: string | null;
  status_code: string | null;
  status_name: string | null;
  is_evaluable: boolean | number | null;
}

function toNumber(value: bigint | number): number {
  return Number(value);
}

function toOptionalNumber(value: string | number | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : null;
}

function toBoolean(value: boolean | number | null): boolean | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return value === 1;
}

function formatDate(value: Date | string | null): string {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function formatStudentName(row: EvaluationModuleStudentRowDb): string {
  return [
    row.last_name_1,
    row.last_name_2,
    row.first_name,
  ]
    .filter((value) => value && value.trim().length > 0)
    .join(' ');
}

function roundPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateAverage(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce(
    (sum, value) => sum + value,
    0,
  );

  return Math.round((total / values.length) * 100) / 100;
}

function getRiskWarnings(
  summary: EvaluationModuleReportSummary,
): string[] {
  const warnings: string[] = [];

  if (summary.enrolled === 0) {
    warnings.push('No hay alumnado matriculado en el módulo seleccionado para el curso de la evaluación.');
    return warnings;
  }

  if (summary.graded === 0) {
    warnings.push('Hay alumnado matriculado, pero no existen calificaciones registradas para esta evaluación.');
  }

  if (summary.notEvaluated > 0) {
    warnings.push('Existen alumnos con estados no evaluables o sin calificación registrada.');
  }

  if (summary.performanceRate < 50 && summary.graded > 0) {
    warnings.push('La tasa de rendimiento es inferior al 50 %. Conviene revisar los casos no superados o no evaluados.');
  }

  return warnings;
}

function buildStatusSummary(
  students: EvaluationModuleReportStudentRow[],
): EvaluationModuleReportStatusRow[] {
  const counter = new Map<string, EvaluationModuleReportStatusRow>();

  students.forEach((student) => {
    const code = student.statusCode || 'SIN_CALIFICACION';
    const name = student.statusName || 'Sin calificación';
    const current = counter.get(code);

    if (current) {
      current.total += 1;
      return;
    }

    counter.set(code, {
      statusCode: code,
      statusName: name,
      total: 1,
    });
  });

  return [...counter.values()].sort((first, second) => second.total - first.total);
}

export async function buildEvaluationModuleReport(
  context: EvaluationModuleReportContext,
  outputFormat: DocumentOutputFormat,
  generatedAt: Date,
): Promise<EvaluationModuleReportModel> {
  const headerRows = await prisma.$queryRaw<EvaluationModuleHeaderRow[]>`
    SELECT
      e.id AS evaluation_id,
      e.code AS evaluation_code,
      e.name AS evaluation_name,
      e.status AS evaluation_status,
      e.starts_at AS evaluation_starts_at,
      e.ends_at AS evaluation_ends_at,
      ay.id AS academic_year_id,
      ay.name AS academic_year_name,
      c.id AS centre_id,
      c.name AS centre_name,
      c.short_name AS centre_short_name,
      m.id AS module_id,
      m.code AS module_code,
      m.name AS module_name,
      m.acronym AS module_acronym,
      vp.id AS programme_id,
      vp.name AS programme_name,
      vp.acronym AS programme_acronym,
      al.id AS level_id,
      al.name AS level_name
    FROM evaluations e
    INNER JOIN academic_years ay ON ay.id = e.academic_year_id
    INNER JOIN centres c ON c.id = e.centre_id
    INNER JOIN modules m ON m.id = ${context.moduleId}
    INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
    INNER JOIN academic_levels al ON al.id = m.academic_level_id
    WHERE e.id = ${context.evaluationId}
      AND e.deleted_at IS NULL
      AND ay.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND m.deleted_at IS NULL
      AND vp.deleted_at IS NULL
      AND al.deleted_at IS NULL
    LIMIT 1
  `;

  const header = headerRows[0];

  if (!header) {
    throw new Error('No se ha encontrado la evaluación o el módulo seleccionado.');
  }

  const studentRows = await prisma.$queryRaw<EvaluationModuleStudentRowDb[]>`
    SELECT
      s.id AS student_id,
      s.student_code,
      s.first_name,
      s.last_name_1,
      s.last_name_2,
      en.status AS enrolment_status,
      g.numeric_grade,
      g.final_grade,
      g.is_passed,
      g.remarks AS grade_remarks,
      gs.code AS status_code,
      gs.name AS status_name,
      gs.is_evaluable
    FROM enrolments en
    INNER JOIN students s ON s.id = en.student_id
    LEFT JOIN grades g
      ON g.enrolment_id = en.id
      AND g.evaluation_id = ${context.evaluationId}
      AND g.deleted_at IS NULL
    LEFT JOIN grade_statuses gs
      ON gs.id = g.grade_status_id
      AND gs.deleted_at IS NULL
    WHERE en.academic_year_id = ${toNumber(header.academic_year_id)}
      AND en.centre_id = ${toNumber(header.centre_id)}
      AND en.module_id = ${context.moduleId}
      AND en.deleted_at IS NULL
      AND s.deleted_at IS NULL
    ORDER BY s.last_name_1 ASC, s.last_name_2 ASC, s.first_name ASC
  `;

  const students: EvaluationModuleReportStudentRow[] = studentRows.map((row) => {
    const numericGrade = toOptionalNumber(row.numeric_grade);
    const finalGrade = toOptionalNumber(row.final_grade);
    const isEvaluable = toBoolean(row.is_evaluable) ?? (numericGrade !== null || finalGrade !== null);

    return {
      studentId: toNumber(row.student_id),
      studentCode: row.student_code ?? '',
      studentName: formatStudentName(row),
      enrolmentStatus: row.enrolment_status,
      numericGrade,
      finalGrade,
      statusCode: row.status_code ?? (numericGrade !== null || finalGrade !== null ? 'NUMERICA' : 'SIN_CALIFICACION'),
      statusName: row.status_name ?? (numericGrade !== null || finalGrade !== null ? 'Calificación numérica' : 'Sin calificación'),
      isEvaluable,
      isPassed: toBoolean(row.is_passed),
      remarks: row.grade_remarks ?? '',
    };
  });

  const gradedStudents = students.filter((student) =>
    student.numericGrade !== null
    || student.finalGrade !== null
    || student.statusCode !== 'SIN_CALIFICACION',
  );
  const numericGrades = students
    .map((student) => student.finalGrade ?? student.numericGrade)
    .filter((value): value is number => value !== null);
  const evaluated = students.filter((student) => student.isEvaluable && (student.numericGrade !== null || student.finalGrade !== null)).length;
  const passed = students.filter((student) => student.isPassed === true).length;
  const failed = students.filter((student) => student.isPassed === false && student.isEvaluable).length;
  const enrolled = students.length;
  const notEvaluated = Math.max(enrolled - evaluated, 0);

  const summary: EvaluationModuleReportSummary = {
    enrolled,
    graded: gradedStudents.length,
    evaluated,
    passed,
    failed,
    notEvaluated,
    successRate: evaluated > 0 ? roundPercentage((passed / evaluated) * 100) : 0,
    performanceRate: enrolled > 0 ? roundPercentage((passed / enrolled) * 100) : 0,
    averageGrade: calculateAverage(numericGrades),
  };

  return {
    title: 'Informe de evaluación de módulo',
    generatedAt,
    outputFormat,
    context,
    academicYear: {
      id: toNumber(header.academic_year_id),
      name: header.academic_year_name,
    },
    centre: {
      id: toNumber(header.centre_id),
      name: header.centre_name,
      shortName: header.centre_short_name ?? '',
    },
    evaluation: {
      id: toNumber(header.evaluation_id),
      code: header.evaluation_code,
      name: header.evaluation_name,
      status: header.evaluation_status,
      startsAt: formatDate(header.evaluation_starts_at),
      endsAt: formatDate(header.evaluation_ends_at),
    },
    module: {
      id: toNumber(header.module_id),
      code: header.module_code,
      name: header.module_name,
      acronym: header.module_acronym ?? '',
      programmeId: toNumber(header.programme_id),
      programmeName: header.programme_name,
      programmeAcronym: header.programme_acronym,
      levelId: toNumber(header.level_id),
      levelName: header.level_name,
    },
    summary,
    statusSummary: buildStatusSummary(students),
    students,
    warnings: getRiskWarnings(summary),
  };
}
