import { prisma } from '../../../config/database.js';
import type { DocumentOutputFormat } from '../document-template.types.js';

export interface WorkPlacementMemoryContext {
  academicYearId: number;
}

export interface WorkPlacementMemorySummary {
  totalPlacements: number;
  totalStudents: number;
  totalCompanies: number;
  totalHours: number;
  completedHours: number;
  pendingDocuments: number;
  followups: number;
  incidents: number;
}

export interface WorkPlacementMemoryStatusSummary {
  status: string;
  total: number;
}

export interface WorkPlacementMemoryCompanySummary {
  companyId: number;
  companyName: string;
  placements: number;
  students: number;
  totalHours: number;
  completedHours: number;
  pendingDocuments: number;
}

export interface WorkPlacementMemoryPlacementRow {
  id: number;
  studentId: number;
  studentName: string;
  studentCode: string;
  centreName: string;
  companyId: number;
  companyName: string;
  companyTutorName: string;
  academicTutorName: string;
  status: string;
  startsAt: string;
  endsAt: string;
  schedule: string;
  totalHours: number | null;
  completedHours: number | null;
  activities: string;
  learningOutcomes: string;
  finalEvaluation: string;
  documentationPending: boolean;
  remarks: string;
  followups: number;
  incidents: number;
}

export interface WorkPlacementMemoryModel {
  title: string;
  generatedAt: Date;
  outputFormat: DocumentOutputFormat;
  context: WorkPlacementMemoryContext;
  academicYear: {
    id: number;
    name: string;
  };
  summary: WorkPlacementMemorySummary;
  statusSummary: WorkPlacementMemoryStatusSummary[];
  companySummary: WorkPlacementMemoryCompanySummary[];
  placements: WorkPlacementMemoryPlacementRow[];
  warnings: string[];
}

interface AcademicYearRow {
  academic_year_id: bigint | number;
  academic_year_name: string;
}

interface PlacementDbRow {
  placement_id: bigint | number;
  student_id: bigint | number;
  student_code: string | null;
  first_name: string;
  last_name_1: string;
  last_name_2: string | null;
  centre_name: string;
  company_id: bigint | number;
  company_name: string;
  company_tutor_first_name: string | null;
  company_tutor_last_name: string | null;
  academic_tutor_name: string | null;
  status: string;
  starts_at: Date | string | null;
  ends_at: Date | string | null;
  schedule: string | null;
  total_hours: number | null;
  completed_hours: number | null;
  activities: string | null;
  learning_outcomes: string | null;
  final_evaluation: string | null;
  documentation_pending: boolean | number;
  remarks: string | null;
  followups_count: bigint | number;
  incidents_count: bigint | number;
}

function toNumber(value: bigint | number): number {
  return Number(value);
}

function toBoolean(value: boolean | number): boolean {
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

function formatStudentName(row: PlacementDbRow): string {
  return [
    row.last_name_1,
    row.last_name_2,
    row.first_name,
  ]
    .filter((value) => value && value.trim().length > 0)
    .join(' ');
}

function formatTutorName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName]
    .filter((value) => value && value.trim().length > 0)
    .join(' ');
}

function buildSummary(placements: WorkPlacementMemoryPlacementRow[]): WorkPlacementMemorySummary {
  const studentIds = new Set<number>();
  const companyIds = new Set<number>();

  let totalHours = 0;
  let completedHours = 0;
  let pendingDocuments = 0;
  let followups = 0;
  let incidents = 0;

  placements.forEach((placement) => {
    studentIds.add(placement.studentId);
    companyIds.add(placement.companyId);
    totalHours += placement.totalHours ?? 0;
    completedHours += placement.completedHours ?? 0;
    pendingDocuments += placement.documentationPending ? 1 : 0;
    followups += placement.followups;
    incidents += placement.incidents;
  });

  return {
    totalPlacements: placements.length,
    totalStudents: studentIds.size,
    totalCompanies: companyIds.size,
    totalHours,
    completedHours,
    pendingDocuments,
    followups,
    incidents,
  };
}

function buildStatusSummary(placements: WorkPlacementMemoryPlacementRow[]): WorkPlacementMemoryStatusSummary[] {
  const counter = new Map<string, number>();

  placements.forEach((placement) => {
    counter.set(
      placement.status,
      (counter.get(placement.status) ?? 0) + 1,
    );
  });

  return [...counter.entries()]
    .map(([status, total]) => ({ status, total }))
    .sort((first, second) => second.total - first.total);
}

function buildCompanySummary(placements: WorkPlacementMemoryPlacementRow[]): WorkPlacementMemoryCompanySummary[] {
  const summary = new Map<number, WorkPlacementMemoryCompanySummary & { studentIds: Set<number> }>();

  placements.forEach((placement) => {
    const current = summary.get(placement.companyId);

    if (current) {
      current.placements += 1;
      current.studentIds.add(placement.studentId);
      current.students = current.studentIds.size;
      current.totalHours += placement.totalHours ?? 0;
      current.completedHours += placement.completedHours ?? 0;
      current.pendingDocuments += placement.documentationPending ? 1 : 0;
      return;
    }

    summary.set(placement.companyId, {
      companyId: placement.companyId,
      companyName: placement.companyName,
      placements: 1,
      students: 1,
      studentIds: new Set([placement.studentId]),
      totalHours: placement.totalHours ?? 0,
      completedHours: placement.completedHours ?? 0,
      pendingDocuments: placement.documentationPending ? 1 : 0,
    });
  });

  return [...summary.values()]
    .map(({ studentIds: _studentIds, ...row }) => row)
    .sort((first, second) => second.placements - first.placements);
}

function buildWarnings(summary: WorkPlacementMemorySummary): string[] {
  const warnings: string[] = [];

  if (summary.totalPlacements === 0) {
    warnings.push('No hay estancias de formación en empresa registradas para el curso académico seleccionado.');
    return warnings;
  }

  if (summary.pendingDocuments > 0) {
    warnings.push(`Hay ${summary.pendingDocuments} estancia(s) con documentación pendiente.`);
  }

  if (summary.incidents > 0) {
    warnings.push(`Hay ${summary.incidents} incidencia(s) registradas en formación en empresa.`);
  }

  if (summary.completedHours < summary.totalHours) {
    warnings.push('Las horas completadas son inferiores a las horas previstas. Conviene revisar estancias activas o incompletas.');
  }

  return warnings;
}

export async function buildWorkPlacementMemory(
  context: WorkPlacementMemoryContext,
  outputFormat: DocumentOutputFormat,
  generatedAt: Date,
): Promise<WorkPlacementMemoryModel> {
  const academicYearRows = await prisma.$queryRaw<AcademicYearRow[]>`
    SELECT
      id AS academic_year_id,
      name AS academic_year_name
    FROM academic_years
    WHERE id = ${context.academicYearId}
      AND deleted_at IS NULL
    LIMIT 1
  `;

  const academicYear = academicYearRows[0];

  if (!academicYear) {
    throw new Error('No se ha encontrado el curso académico seleccionado.');
  }

  const rows = await prisma.$queryRaw<PlacementDbRow[]>`
    SELECT
      wp.id AS placement_id,
      s.id AS student_id,
      s.student_code,
      s.first_name,
      s.last_name_1,
      s.last_name_2,
      c.name AS centre_name,
      co.id AS company_id,
      co.name AS company_name,
      ct.first_name AS company_tutor_first_name,
      ct.last_name AS company_tutor_last_name,
      u.name AS academic_tutor_name,
      wp.status,
      wp.starts_at,
      wp.ends_at,
      wp.schedule,
      wp.total_hours,
      wp.completed_hours,
      wp.activities,
      wp.learning_outcomes,
      wp.final_evaluation,
      wp.documentation_pending,
      wp.remarks,
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
    INNER JOIN students s ON s.id = wp.student_id
    INNER JOIN centres c ON c.id = wp.centre_id
    INNER JOIN companies co ON co.id = wp.company_id
    LEFT JOIN company_tutors ct ON ct.id = wp.company_tutor_id AND ct.deleted_at IS NULL
    LEFT JOIN users u ON u.id = wp.academic_tutor_user_id AND u.deleted_at IS NULL
    WHERE wp.academic_year_id = ${context.academicYearId}
      AND wp.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND co.deleted_at IS NULL
    ORDER BY co.name ASC, s.last_name_1 ASC, s.last_name_2 ASC, s.first_name ASC
  `;

  const placements = rows.map((row) => ({
    id: toNumber(row.placement_id),
    studentId: toNumber(row.student_id),
    studentName: formatStudentName(row),
    studentCode: row.student_code ?? '',
    centreName: row.centre_name,
    companyId: toNumber(row.company_id),
    companyName: row.company_name,
    companyTutorName: formatTutorName(row.company_tutor_first_name, row.company_tutor_last_name),
    academicTutorName: row.academic_tutor_name ?? '',
    status: row.status,
    startsAt: formatDate(row.starts_at),
    endsAt: formatDate(row.ends_at),
    schedule: row.schedule ?? '',
    totalHours: row.total_hours,
    completedHours: row.completed_hours,
    activities: row.activities ?? '',
    learningOutcomes: row.learning_outcomes ?? '',
    finalEvaluation: row.final_evaluation ?? '',
    documentationPending: toBoolean(row.documentation_pending),
    remarks: row.remarks ?? '',
    followups: toNumber(row.followups_count),
    incidents: toNumber(row.incidents_count),
  }));
  const summary = buildSummary(placements);

  return {
    title: 'Memoria de formación en empresa',
    generatedAt,
    outputFormat,
    context,
    academicYear: {
      id: toNumber(academicYear.academic_year_id),
      name: academicYear.academic_year_name,
    },
    summary,
    statusSummary: buildStatusSummary(placements),
    companySummary: buildCompanySummary(placements),
    placements,
    warnings: buildWarnings(summary),
  };
}
