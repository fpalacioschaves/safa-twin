import { prisma } from '../../../config/database.js';
import type {
  DocumentOutputFormat,
} from '../document-template.types.js';

export interface StudentAcademicRecordContext {
  studentId: number;
}

export interface StudentAcademicRecordSummary {
  moduleEnrolments: number;
  evaluated: number;
  passed: number;
  failed: number;
  notEvaluated: number;
  averageGrade: number | null;
  performanceRate: number;
}

export interface StudentAcademicRecordEnrolment {
  enrolmentId: number;
  academicYearName: string;
  centreName: string;
  programmeAcronym: string;
  programmeName: string;
  levelName: string;
  moduleCode: string;
  moduleName: string;
  status: string;
  enrolledAt: string;
  remarks: string;
}

export interface StudentAcademicRecordGrade {
  enrolmentId: number;
  academicYearName: string;
  moduleCode: string;
  moduleName: string;
  evaluationSequence: number | null;
  evaluationName: string;
  numericGrade: number | null;
  finalGrade: number | null;
  statusCode: string;
  statusName: string;
  isEvaluable: boolean;
  isPassed: boolean | null;
  remarks: string;
}

export interface StudentAcademicRecordWorkPlacement {
  id: number;
  academicYearName: string;
  centreName: string;
  companyName: string;
  companyTutorName: string;
  academicTutorName: string;
  status: string;
  startsAt: string;
  endsAt: string;
  totalHours: number | null;
  completedHours: number | null;
  documentationPending: boolean;
  activities: string;
  finalEvaluation: string;
  followups: number;
  incidents: number;
}

export interface StudentAcademicRecordPlacementIncident {
  workPlacementId: number;
  companyName: string;
  severity: string;
  occurredAt: string;
  title: string;
  description: string;
  resolution: string;
  resolvedAt: string;
}

export interface StudentAcademicRecordModel {
  title: string;
  generatedAt: Date;
  outputFormat: DocumentOutputFormat;
  context: StudentAcademicRecordContext;
  student: {
    id: number;
    code: string;
    fullName: string;
    documentType: string;
    documentNumber: string;
    email: string;
    phone: string;
    city: string;
    province: string;
    isActive: boolean;
    notes: string;
  };
  summary: StudentAcademicRecordSummary;
  enrolments: StudentAcademicRecordEnrolment[];
  grades: StudentAcademicRecordGrade[];
  latestGrades: StudentAcademicRecordGrade[];
  workPlacements: StudentAcademicRecordWorkPlacement[];
  placementIncidents: StudentAcademicRecordPlacementIncident[];
  warnings: string[];
}

interface StudentRow {
  student_id: bigint | number;
  student_code: string | null;
  first_name: string;
  last_name_1: string;
  last_name_2: string | null;
  document_type: string | null;
  document_number: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  province: string | null;
  is_active: boolean | number;
  notes: string | null;
}

interface GradeRow {
  enrolment_id: bigint | number;
  academic_year_name: string;
  centre_name: string;
  programme_acronym: string;
  programme_name: string;
  level_name: string;
  module_code: string;
  module_name: string;
  enrolment_status: string;
  enrolled_at: Date | string;
  enrolment_remarks: string | null;
  evaluation_id: bigint | number | null;
  evaluation_sequence: number | null;
  evaluation_name: string | null;
  numeric_grade: string | number | null;
  final_grade: string | number | null;
  is_passed: boolean | number | null;
  grade_remarks: string | null;
  status_code: string | null;
  status_name: string | null;
  is_evaluable: boolean | number | null;
}

interface WorkPlacementRow {
  work_placement_id: bigint | number;
  academic_year_name: string;
  centre_name: string;
  company_name: string;
  company_tutor_first_name: string | null;
  company_tutor_last_name: string | null;
  academic_tutor_name: string | null;
  status: string;
  starts_at: Date | string | null;
  ends_at: Date | string | null;
  total_hours: number | null;
  completed_hours: number | null;
  documentation_pending: boolean | number;
  activities: string | null;
  final_evaluation: string | null;
  followups_count: bigint | number;
  incidents_count: bigint | number;
}

interface PlacementIncidentRow {
  work_placement_id: bigint | number;
  company_name: string;
  severity: string;
  occurred_at: Date | string;
  title: string;
  description: string;
  resolution: string | null;
  resolved_at: Date | string | null;
}

function toNumber(value: bigint | number): number {
  return Number(value);
}

function toOptionalNumber(value: string | number | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
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

function formatStudentName(row: StudentRow): string {
  return [
    row.last_name_1,
    row.last_name_2,
    row.first_name,
  ]
    .filter((value) => value && value.trim().length > 0)
    .join(' ');
}

function formatTutorName(
  firstName: string | null,
  lastName: string | null,
): string {
  return [firstName, lastName]
    .filter((value) => value && value.trim().length > 0)
    .join(' ');
}

function calculateAverage(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);

  return Math.round((total / values.length) * 100) / 100;
}

function roundPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildEnrolments(rows: GradeRow[]): StudentAcademicRecordEnrolment[] {
  const enrolments = new Map<number, StudentAcademicRecordEnrolment>();

  rows.forEach((row) => {
    const enrolmentId = toNumber(row.enrolment_id);

    if (enrolments.has(enrolmentId)) {
      return;
    }

    enrolments.set(enrolmentId, {
      enrolmentId,
      academicYearName: row.academic_year_name,
      centreName: row.centre_name,
      programmeAcronym: row.programme_acronym,
      programmeName: row.programme_name,
      levelName: row.level_name,
      moduleCode: row.module_code,
      moduleName: row.module_name,
      status: row.enrolment_status,
      enrolledAt: formatDate(row.enrolled_at),
      remarks: row.enrolment_remarks ?? '',
    });
  });

  return [...enrolments.values()];
}

function buildGrades(rows: GradeRow[]): StudentAcademicRecordGrade[] {
  return rows
    .filter((row) => row.evaluation_id !== null)
    .map((row) => {
      const numericGrade = toOptionalNumber(row.numeric_grade);
      const finalGrade = toOptionalNumber(row.final_grade);
      const hasNumericGrade = numericGrade !== null || finalGrade !== null;

      return {
        enrolmentId: toNumber(row.enrolment_id),
        academicYearName: row.academic_year_name,
        moduleCode: row.module_code,
        moduleName: row.module_name,
        evaluationSequence: row.evaluation_sequence,
        evaluationName: row.evaluation_name ?? '',
        numericGrade,
        finalGrade,
        statusCode: row.status_code ?? (hasNumericGrade ? 'NUMERICA' : 'SIN_CALIFICACION'),
        statusName: row.status_name ?? (hasNumericGrade ? 'Calificación numérica' : 'Sin calificación'),
        isEvaluable: toBoolean(row.is_evaluable) ?? hasNumericGrade,
        isPassed: toBoolean(row.is_passed),
        remarks: row.grade_remarks ?? '',
      };
    });
}

function buildLatestGrades(
  enrolments: StudentAcademicRecordEnrolment[],
  grades: StudentAcademicRecordGrade[],
): StudentAcademicRecordGrade[] {
  return enrolments.map((enrolment) => {
    const enrolmentGrades = grades
      .filter((grade) => grade.enrolmentId === enrolment.enrolmentId)
      .sort((first, second) => (second.evaluationSequence ?? 0) - (first.evaluationSequence ?? 0));

    const latestGrade = enrolmentGrades[0];

    if (latestGrade) {
      return latestGrade;
    }

    return {
      enrolmentId: enrolment.enrolmentId,
      academicYearName: enrolment.academicYearName,
      moduleCode: enrolment.moduleCode,
      moduleName: enrolment.moduleName,
      evaluationSequence: null,
      evaluationName: 'Sin evaluación registrada',
      numericGrade: null,
      finalGrade: null,
      statusCode: 'SIN_CALIFICACION',
      statusName: 'Sin calificación',
      isEvaluable: false,
      isPassed: null,
      remarks: '',
    };
  });
}

function buildSummary(latestGrades: StudentAcademicRecordGrade[]): StudentAcademicRecordSummary {
  const numericGrades = latestGrades
    .map((grade) => grade.finalGrade ?? grade.numericGrade)
    .filter((value): value is number => value !== null);
  const moduleEnrolments = latestGrades.length;
  const evaluated = latestGrades.filter((grade) => grade.isEvaluable && (grade.numericGrade !== null || grade.finalGrade !== null)).length;
  const passed = latestGrades.filter((grade) => grade.isPassed === true).length;
  const failed = latestGrades.filter((grade) => grade.isPassed === false && grade.isEvaluable).length;
  const notEvaluated = Math.max(moduleEnrolments - evaluated, 0);

  return {
    moduleEnrolments,
    evaluated,
    passed,
    failed,
    notEvaluated,
    averageGrade: calculateAverage(numericGrades),
    performanceRate: moduleEnrolments > 0 ? roundPercentage((passed / moduleEnrolments) * 100) : 0,
  };
}

function buildWarnings(
  summary: StudentAcademicRecordSummary,
  workPlacements: StudentAcademicRecordWorkPlacement[],
  placementIncidents: StudentAcademicRecordPlacementIncident[],
): string[] {
  const warnings: string[] = [];

  if (summary.moduleEnrolments === 0) {
    warnings.push('El alumno no tiene matrículas registradas.');
  }

  if (summary.moduleEnrolments > 0 && summary.evaluated === 0) {
    warnings.push('El alumno tiene matrículas, pero no tiene calificaciones numéricas registradas.');
  }

  if (summary.notEvaluated > 0) {
    warnings.push('El alumno tiene módulos sin calificación numérica en la última evaluación disponible.');
  }

  if (summary.failed > 0) {
    warnings.push('El alumno tiene módulos no superados.');
  }

  if (workPlacements.some((placement) => placement.documentationPending)) {
    warnings.push('El alumno tiene documentación pendiente en formación en empresa.');
  }

  if (placementIncidents.length > 0) {
    warnings.push('El alumno tiene incidencias registradas en formación en empresa.');
  }

  return warnings;
}

export async function buildStudentAcademicRecord(
  context: StudentAcademicRecordContext,
  outputFormat: DocumentOutputFormat,
  generatedAt: Date,
): Promise<StudentAcademicRecordModel> {
  const studentRows = await prisma.$queryRaw<StudentRow[]>`
    SELECT
      id AS student_id,
      student_code,
      first_name,
      last_name_1,
      last_name_2,
      document_type,
      document_number,
      email,
      phone,
      city,
      province,
      is_active,
      notes
    FROM students
    WHERE id = ${context.studentId}
      AND deleted_at IS NULL
    LIMIT 1
  `;

  const student = studentRows[0];

  if (!student) {
    throw new Error('No se ha encontrado el alumno seleccionado.');
  }

  const gradeRows = await prisma.$queryRaw<GradeRow[]>`
    SELECT
      en.id AS enrolment_id,
      ay.name AS academic_year_name,
      c.name AS centre_name,
      vp.acronym AS programme_acronym,
      vp.name AS programme_name,
      al.name AS level_name,
      m.code AS module_code,
      m.name AS module_name,
      en.status AS enrolment_status,
      en.enrolled_at,
      en.remarks AS enrolment_remarks,
      ev.id AS evaluation_id,
      ev.sequence AS evaluation_sequence,
      ev.name AS evaluation_name,
      g.numeric_grade,
      g.final_grade,
      g.is_passed,
      g.remarks AS grade_remarks,
      gs.code AS status_code,
      gs.name AS status_name,
      gs.is_evaluable
    FROM enrolments en
    INNER JOIN academic_years ay ON ay.id = en.academic_year_id
    INNER JOIN centres c ON c.id = en.centre_id
    INNER JOIN modules m ON m.id = en.module_id
    INNER JOIN vocational_programmes vp ON vp.id = m.vocational_programme_id
    INNER JOIN academic_levels al ON al.id = m.academic_level_id
    LEFT JOIN grades g ON g.enrolment_id = en.id AND g.deleted_at IS NULL
    LEFT JOIN evaluations ev ON ev.id = g.evaluation_id AND ev.deleted_at IS NULL
    LEFT JOIN grade_statuses gs ON gs.id = g.grade_status_id AND gs.deleted_at IS NULL
    WHERE en.student_id = ${context.studentId}
      AND en.deleted_at IS NULL
      AND ay.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND m.deleted_at IS NULL
      AND vp.deleted_at IS NULL
      AND al.deleted_at IS NULL
    ORDER BY ay.start_date ASC, m.sort_order ASC, m.code ASC, ev.sequence ASC
  `;

  const workPlacementRows = await prisma.$queryRaw<WorkPlacementRow[]>`
    SELECT
      wp.id AS work_placement_id,
      ay.name AS academic_year_name,
      c.name AS centre_name,
      co.name AS company_name,
      ct.first_name AS company_tutor_first_name,
      ct.last_name AS company_tutor_last_name,
      u.name AS academic_tutor_name,
      wp.status,
      wp.starts_at,
      wp.ends_at,
      wp.total_hours,
      wp.completed_hours,
      wp.documentation_pending,
      wp.activities,
      wp.final_evaluation,
      (
        SELECT COUNT(*)
        FROM placement_followups pf
        WHERE pf.work_placement_id = wp.id
          AND pf.deleted_at IS NULL
      ) AS followups_count,
      (
        SELECT COUNT(*)
        FROM placement_incidents pi
        WHERE pi.work_placement_id = wp.id
          AND pi.deleted_at IS NULL
      ) AS incidents_count
    FROM work_placements wp
    INNER JOIN academic_years ay ON ay.id = wp.academic_year_id
    INNER JOIN centres c ON c.id = wp.centre_id
    INNER JOIN companies co ON co.id = wp.company_id
    LEFT JOIN company_tutors ct ON ct.id = wp.company_tutor_id AND ct.deleted_at IS NULL
    LEFT JOIN users u ON u.id = wp.academic_tutor_user_id AND u.deleted_at IS NULL
    WHERE wp.student_id = ${context.studentId}
      AND wp.deleted_at IS NULL
      AND ay.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND co.deleted_at IS NULL
    ORDER BY ay.start_date ASC, wp.starts_at ASC, wp.id ASC
  `;

  const placementIncidentRows = await prisma.$queryRaw<PlacementIncidentRow[]>`
    SELECT
      wp.id AS work_placement_id,
      co.name AS company_name,
      pi.severity,
      pi.occurred_at,
      pi.title,
      pi.description,
      pi.resolution,
      pi.resolved_at
    FROM placement_incidents pi
    INNER JOIN work_placements wp ON wp.id = pi.work_placement_id
    INNER JOIN companies co ON co.id = wp.company_id
    WHERE wp.student_id = ${context.studentId}
      AND pi.deleted_at IS NULL
      AND wp.deleted_at IS NULL
      AND co.deleted_at IS NULL
    ORDER BY pi.occurred_at ASC, pi.id ASC
  `;

  const enrolments = buildEnrolments(gradeRows);
  const grades = buildGrades(gradeRows);
  const latestGrades = buildLatestGrades(enrolments, grades);
  const workPlacements = workPlacementRows.map((placement) => ({
    id: toNumber(placement.work_placement_id),
    academicYearName: placement.academic_year_name,
    centreName: placement.centre_name,
    companyName: placement.company_name,
    companyTutorName: formatTutorName(placement.company_tutor_first_name, placement.company_tutor_last_name),
    academicTutorName: placement.academic_tutor_name ?? '',
    status: placement.status,
    startsAt: formatDate(placement.starts_at),
    endsAt: formatDate(placement.ends_at),
    totalHours: placement.total_hours,
    completedHours: placement.completed_hours,
    documentationPending: toBoolean(placement.documentation_pending) ?? false,
    activities: placement.activities ?? '',
    finalEvaluation: placement.final_evaluation ?? '',
    followups: toNumber(placement.followups_count),
    incidents: toNumber(placement.incidents_count),
  }));
  const placementIncidents = placementIncidentRows.map((incident) => ({
    workPlacementId: toNumber(incident.work_placement_id),
    companyName: incident.company_name,
    severity: incident.severity,
    occurredAt: formatDate(incident.occurred_at),
    title: incident.title,
    description: incident.description,
    resolution: incident.resolution ?? '',
    resolvedAt: formatDate(incident.resolved_at),
  }));
  const summary = buildSummary(latestGrades);

  return {
    title: 'Informe individual del alumno',
    generatedAt,
    outputFormat,
    context,
    student: {
      id: toNumber(student.student_id),
      code: student.student_code ?? '',
      fullName: formatStudentName(student),
      documentType: student.document_type ?? '',
      documentNumber: student.document_number ?? '',
      email: student.email ?? '',
      phone: student.phone ?? '',
      city: student.city ?? '',
      province: student.province ?? '',
      isActive: toBoolean(student.is_active) ?? false,
      notes: student.notes ?? '',
    },
    summary,
    enrolments,
    grades,
    latestGrades,
    workPlacements,
    placementIncidents,
    warnings: buildWarnings(summary, workPlacements, placementIncidents),
  };
}
