import {
  mkdir,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

import { prisma } from '../../config/database.js';

import type {
  CompanyTrainingReportExportInput,
  CompanyTrainingReportFilters,
} from './company-training-reports.schemas.js';

const EXPORT_MAX_ROWS = 5000;

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  ASSIGNED: 'Asignada',
  ACTIVE: 'En curso',
  COMPLETED: 'Finalizada',
  CANCELLED: 'Cancelada',
};

interface RawReportRow {
  id: bigint | number;
  student_id: bigint | number;
  student_code: string | null;
  student_full_name: string;
  academic_year_id: bigint | number;
  academic_year_name: string;
  centre_id: bigint | number;
  centre_name: string;
  company_id: bigint | number;
  company_name: string;
  company_tutor_full_name: string | null;
  academic_tutor_name: string | null;
  status: string;
  starts_at: Date | string | null;
  ends_at: Date | string | null;
  schedule: string | null;
  total_hours: bigint | number | null;
  completed_hours: bigint | number | null;
  activities: string | null;
  learning_outcomes: string | null;
  final_evaluation: string | null;
  documentation_pending: boolean | bigint | number;
  remarks: string | null;
  followups_count: bigint | number;
  last_followup_at: Date | string | null;
  open_incidents_count: bigint | number;
  resolved_incidents_count: bigint | number;
  total_incidents_count: bigint | number;
}

export interface CompanyTrainingReportItem {
  id: number;
  studentId: number;
  studentCode: string | null;
  studentFullName: string;
  academicYearId: number;
  academicYearName: string;
  centreId: number;
  centreName: string;
  companyId: number;
  companyName: string;
  companyTutorFullName: string | null;
  academicTutorName: string | null;
  status: string;
  statusLabel: string;
  startsAt: string | null;
  endsAt: string | null;
  schedule: string | null;
  totalHours: number | null;
  completedHours: number | null;
  activities: string | null;
  learningOutcomes: string | null;
  finalEvaluation: string | null;
  documentationPending: boolean;
  remarks: string | null;
  followupsCount: number;
  lastFollowupAt: string | null;
  openIncidentsCount: number;
  resolvedIncidentsCount: number;
  totalIncidentsCount: number;
}

export interface CompanyTrainingReportSummary {
  totalPlacements: number;
  pendingDocumentationCount: number;
  placementsWithoutFollowupsCount: number;
  openIncidentsCount: number;
  resolvedIncidentsCount: number;
  followupsCount: number;
  placementsByStatus: Record<string, number>;
}

export interface CompanyTrainingReportPreview {
  filters: CompanyTrainingReportFilters;
  summary: CompanyTrainingReportSummary;
  items: CompanyTrainingReportItem[];
  total: number;
  exportedRowsLimit: number;
  isPreviewTruncated: boolean;
  isExportTruncated: boolean;
}

export interface CompanyTrainingReportDocument {
  id: number;
  documentType: string;
  title: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSizeBytes: number;
  downloadUrl: string;
}

export interface CompanyTrainingReportExportResult {
  message: string;
  document: CompanyTrainingReportDocument;
}

function toNumber(value: bigint | number): number {
  return Number(value);
}

function toNumberOrNull(
  value: bigint | number | null,
): number | null {
  return value === null
    ? null
    : Number(value);
}

function toDateOnly(
  value: Date | string | null,
): string | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function toDateTimeIso(
  value: Date | string | null,
): string | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toISOString();
}

function toBoolean(value: boolean | bigint | number): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return Number(value) === 1;
}

function mapReportRow(
  row: RawReportRow,
): CompanyTrainingReportItem {
  return {
    id: toNumber(row.id),
    studentId: toNumber(row.student_id),
    studentCode: row.student_code,
    studentFullName: row.student_full_name,
    academicYearId: toNumber(row.academic_year_id),
    academicYearName: row.academic_year_name,
    centreId: toNumber(row.centre_id),
    centreName: row.centre_name,
    companyId: toNumber(row.company_id),
    companyName: row.company_name,
    companyTutorFullName: row.company_tutor_full_name,
    academicTutorName: row.academic_tutor_name,
    status: row.status,
    statusLabel: statusLabels[row.status] ?? row.status,
    startsAt: toDateOnly(row.starts_at),
    endsAt: toDateOnly(row.ends_at),
    schedule: row.schedule,
    totalHours: toNumberOrNull(row.total_hours),
    completedHours: toNumberOrNull(row.completed_hours),
    activities: row.activities,
    learningOutcomes: row.learning_outcomes,
    finalEvaluation: row.final_evaluation,
    documentationPending: toBoolean(row.documentation_pending),
    remarks: row.remarks,
    followupsCount: toNumber(row.followups_count),
    lastFollowupAt: toDateTimeIso(row.last_followup_at),
    openIncidentsCount: toNumber(row.open_incidents_count),
    resolvedIncidentsCount: toNumber(row.resolved_incidents_count),
    totalIncidentsCount: toNumber(row.total_incidents_count),
  };
}

function normalizeFilters(
  filters: CompanyTrainingReportFilters,
): CompanyTrainingReportFilters {
  return {
    academicYearId: filters.academicYearId,
    centreId: filters.centreId,
    companyId: filters.companyId,
    status: filters.status,
    documentationPending: filters.documentationPending,
    incidentStatus: filters.incidentStatus,
    maxRows: filters.maxRows,
  };
}

function buildWhereClause(
  filters: Pick<
    CompanyTrainingReportFilters,
    | 'academicYearId'
    | 'centreId'
    | 'companyId'
    | 'status'
    | 'documentationPending'
    | 'incidentStatus'
  >,
): {
  whereSql: string;
  params: unknown[];
} {
  const conditions = [
    'wp.deleted_at IS NULL',
  ];

  const params: unknown[] = [];

  if (filters.academicYearId) {
    conditions.push('wp.academic_year_id = ?');
    params.push(filters.academicYearId);
  }

  if (filters.centreId) {
    conditions.push('wp.centre_id = ?');
    params.push(filters.centreId);
  }

  if (filters.companyId) {
    conditions.push('wp.company_id = ?');
    params.push(filters.companyId);
  }

  if (filters.status !== 'all') {
    conditions.push('wp.status = ?');
    params.push(filters.status);
  }

  if (filters.documentationPending === 'pending') {
    conditions.push('wp.documentation_pending = TRUE');
  }

  if (filters.documentationPending === 'complete') {
    conditions.push('wp.documentation_pending = FALSE');
  }

  if (filters.incidentStatus === 'open') {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM placement_incidents pi_filter
        WHERE pi_filter.work_placement_id = wp.id
          AND pi_filter.deleted_at IS NULL
          AND pi_filter.resolved_at IS NULL
      )
    `);
  }

  if (filters.incidentStatus === 'resolved') {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM placement_incidents pi_filter
        WHERE pi_filter.work_placement_id = wp.id
          AND pi_filter.deleted_at IS NULL
          AND pi_filter.resolved_at IS NOT NULL
      )
    `);
  }

  return {
    whereSql: conditions.join(' AND '),
    params,
  };
}

async function countReportRows(
  filters: CompanyTrainingReportFilters,
): Promise<number> {
  const {
    whereSql,
    params,
  } = buildWhereClause(filters);

  const rows = await prisma.$queryRawUnsafe<Array<{
    total: bigint | number;
  }>>(
    `
      SELECT COUNT(*) AS total
      FROM work_placements wp
      WHERE ${whereSql}
    `,
    ...params,
  );

  return Number(rows[0]?.total ?? 0);
}

async function fetchReportRows(
  filters: CompanyTrainingReportFilters,
  limit: number,
): Promise<CompanyTrainingReportItem[]> {
  const {
    whereSql,
    params,
  } = buildWhereClause(filters);

  const rows = await prisma.$queryRawUnsafe<RawReportRow[]>(
    `
      SELECT
        wp.id,
        wp.student_id,
        s.student_code,
        TRIM(CONCAT_WS(' ', s.first_name, s.last_name_1, s.last_name_2)) AS student_full_name,
        wp.academic_year_id,
        ay.name AS academic_year_name,
        wp.centre_id,
        c.name AS centre_name,
        wp.company_id,
        co.name AS company_name,
        NULLIF(TRIM(CONCAT_WS(' ', ct.first_name, ct.last_name)), '') AS company_tutor_full_name,
        au.name AS academic_tutor_name,
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
        COALESCE((
          SELECT COUNT(*)
          FROM placement_followups pf
          WHERE pf.work_placement_id = wp.id
            AND pf.deleted_at IS NULL
        ), 0) AS followups_count,
        (
          SELECT MAX(pf.followup_at)
          FROM placement_followups pf
          WHERE pf.work_placement_id = wp.id
            AND pf.deleted_at IS NULL
        ) AS last_followup_at,
        COALESCE((
          SELECT COUNT(*)
          FROM placement_incidents pi
          WHERE pi.work_placement_id = wp.id
            AND pi.deleted_at IS NULL
            AND pi.resolved_at IS NULL
        ), 0) AS open_incidents_count,
        COALESCE((
          SELECT COUNT(*)
          FROM placement_incidents pi
          WHERE pi.work_placement_id = wp.id
            AND pi.deleted_at IS NULL
            AND pi.resolved_at IS NOT NULL
        ), 0) AS resolved_incidents_count,
        COALESCE((
          SELECT COUNT(*)
          FROM placement_incidents pi
          WHERE pi.work_placement_id = wp.id
            AND pi.deleted_at IS NULL
        ), 0) AS total_incidents_count
      FROM work_placements wp
      INNER JOIN students s ON s.id = wp.student_id
      INNER JOIN academic_years ay ON ay.id = wp.academic_year_id
      INNER JOIN centres c ON c.id = wp.centre_id
      INNER JOIN companies co ON co.id = wp.company_id
      LEFT JOIN company_tutors ct ON ct.id = wp.company_tutor_id
      LEFT JOIN users au ON au.id = wp.academic_tutor_user_id
      WHERE ${whereSql}
      ORDER BY
        ay.name DESC,
        c.name ASC,
        co.name ASC,
        s.last_name_1 ASC,
        s.last_name_2 ASC,
        s.first_name ASC,
        wp.id ASC
      LIMIT ?
    `,
    ...params,
    limit,
  );

  return rows.map(mapReportRow);
}

function buildSummary(
  items: CompanyTrainingReportItem[],
): CompanyTrainingReportSummary {
  const placementsByStatus: Record<string, number> = {
    PENDING: 0,
    ASSIGNED: 0,
    ACTIVE: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  let pendingDocumentationCount = 0;
  let placementsWithoutFollowupsCount = 0;
  let openIncidentsCount = 0;
  let resolvedIncidentsCount = 0;
  let followupsCount = 0;

  for (const item of items) {
    placementsByStatus[item.status] =
      (placementsByStatus[item.status] ?? 0) + 1;

    if (item.documentationPending) {
      pendingDocumentationCount += 1;
    }

    if (item.followupsCount === 0) {
      placementsWithoutFollowupsCount += 1;
    }

    openIncidentsCount += item.openIncidentsCount;
    resolvedIncidentsCount += item.resolvedIncidentsCount;
    followupsCount += item.followupsCount;
  }

  return {
    totalPlacements: items.length,
    pendingDocumentationCount,
    placementsWithoutFollowupsCount,
    openIncidentsCount,
    resolvedIncidentsCount,
    followupsCount,
    placementsByStatus,
  };
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);

  if (
    text.includes(';')
    || text.includes('"')
    || text.includes('\n')
    || text.includes('\r')
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function buildCsv(
  items: CompanyTrainingReportItem[],
): string {
  const header = [
    'Alumno',
    'Código alumno',
    'Curso académico',
    'Centro',
    'Empresa',
    'Tutor laboral',
    'Tutor académico',
    'Estado',
    'Fecha inicio',
    'Fecha fin',
    'Horario',
    'Horas realizadas',
    'Horas totales',
    'Documentación pendiente',
    'Seguimientos',
    'Último seguimiento',
    'Incidencias abiertas',
    'Incidencias resueltas',
    'Actividades',
    'Resultados de aprendizaje',
    'Evaluación final',
    'Observaciones',
  ];

  const rows = items.map((item) => [
    item.studentFullName,
    item.studentCode,
    item.academicYearName,
    item.centreName,
    item.companyName,
    item.companyTutorFullName,
    item.academicTutorName,
    item.statusLabel,
    item.startsAt,
    item.endsAt,
    item.schedule,
    item.completedHours,
    item.totalHours,
    item.documentationPending ? 'Sí' : 'No',
    item.followupsCount,
    item.lastFollowupAt,
    item.openIncidentsCount,
    item.resolvedIncidentsCount,
    item.activities,
    item.learningOutcomes,
    item.finalEvaluation,
    item.remarks,
  ]);

  return [
    'sep=;',
    header.map(csvEscape).join(';'),
    ...rows.map((row) => row.map(csvEscape).join(';')),
  ].join('\r\n');
}

async function ensureGeneratedDocumentsTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS generated_documents (
      id INT NOT NULL AUTO_INCREMENT,
      generated_by_user_id INT NOT NULL,
      document_type VARCHAR(80) NOT NULL,
      title VARCHAR(191) NOT NULL,
      academic_year_id INT NULL,
      centre_id INT NULL,
      vocational_programme_id INT NULL,
      academic_level_id INT NULL,
      module_id INT NULL,
      evaluation_id INT NULL,
      parameters_json LONGTEXT NOT NULL,
      file_name VARCHAR(191) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      mime_type VARCHAR(191) NOT NULL,
      file_size_bytes BIGINT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      PRIMARY KEY (id),
      UNIQUE KEY generated_documents_file_path_unique (file_path),
      KEY generated_documents_user_idx (generated_by_user_id),
      KEY generated_documents_type_idx (document_type),
      KEY generated_documents_created_idx (created_at),
      KEY generated_documents_scope_idx (academic_year_id, centre_id, vocational_programme_id, academic_level_id, module_id, evaluation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function buildStoragePaths(): {
  directory: string;
  fileName: string;
  filePath: string;
} {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '_');

  const directory = path.join(
    process.cwd(),
    'storage',
    'generated-documents',
    'company-training',
  );

  const fileName =
    `informe_formacion_empresa_${timestamp}.csv`;

  const filePath = path.join(
    'storage',
    'generated-documents',
    'company-training',
    fileName,
  );

  return {
    directory,
    fileName,
    filePath,
  };
}

async function registerGeneratedDocument(input: {
  generatedByUserId: number;
  title: string;
  filters: CompanyTrainingReportExportInput;
  summary: CompanyTrainingReportSummary;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
}): Promise<CompanyTrainingReportDocument> {
  await ensureGeneratedDocumentsTable();

  const documentType = 'COMPANY_TRAINING_REPORT_CSV';
  const mimeType = 'text/csv; charset=utf-8';
  const parameters = JSON.stringify({
    filters: input.filters,
    summary: input.summary,
  });

  const documentId = await prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO generated_documents (
            generated_by_user_id,
            document_type,
            title,
            academic_year_id,
            centre_id,
            vocational_programme_id,
            academic_level_id,
            module_id,
            evaluation_id,
            parameters_json,
            file_name,
            file_path,
            mime_type,
            file_size_bytes
          ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?)
        `,
        input.generatedByUserId,
        documentType,
        input.title,
        input.filters.academicYearId ?? null,
        input.filters.centreId ?? null,
        parameters,
        input.fileName,
        input.filePath,
        mimeType,
        input.fileSizeBytes,
      );

      const rows = await transaction.$queryRawUnsafe<Array<{
        id: bigint | number;
      }>>('SELECT LAST_INSERT_ID() AS id');

      return Number(rows[0]?.id ?? 0);
    },
  );

  return {
    id: documentId,
    documentType,
    title: input.title,
    fileName: input.fileName,
    filePath: input.filePath,
    mimeType,
    fileSizeBytes: input.fileSizeBytes,
    downloadUrl:
      `/api/generated-documents/${documentId}/download`,
  };
}

export async function getCompanyTrainingReportPreview(
  filters: CompanyTrainingReportFilters,
): Promise<CompanyTrainingReportPreview> {
  const normalizedFilters = normalizeFilters(filters);
  const total = await countReportRows(normalizedFilters);
  const rowsForSummary = await fetchReportRows(
    normalizedFilters,
    EXPORT_MAX_ROWS,
  );

  return {
    filters: normalizedFilters,
    summary: buildSummary(rowsForSummary),
    items: rowsForSummary.slice(
      0,
      normalizedFilters.maxRows,
    ),
    total,
    exportedRowsLimit: EXPORT_MAX_ROWS,
    isPreviewTruncated:
      total > normalizedFilters.maxRows,
    isExportTruncated:
      total > EXPORT_MAX_ROWS,
  };
}

export async function exportCompanyTrainingReportCsv(
  input: CompanyTrainingReportExportInput,
  generatedByUserId: number,
): Promise<CompanyTrainingReportExportResult> {
  const filters: CompanyTrainingReportFilters = {
    academicYearId: input.academicYearId,
    centreId: input.centreId,
    companyId: input.companyId,
    status: input.status,
    documentationPending: input.documentationPending,
    incidentStatus: input.incidentStatus,
    maxRows: EXPORT_MAX_ROWS,
  };

  const items = await fetchReportRows(
    filters,
    EXPORT_MAX_ROWS,
  );

  const summary = buildSummary(items);
  const csv = `\uFEFF${buildCsv(items)}`;
  const {
    directory,
    fileName,
    filePath,
  } = buildStoragePaths();

  await mkdir(
    directory,
    {
      recursive: true,
    },
  );

  const absolutePath = path.resolve(
    process.cwd(),
    filePath,
  );

  await writeFile(
    absolutePath,
    csv,
    'utf8',
  );

  const fileStats = await stat(absolutePath);

  const document = await registerGeneratedDocument({
    generatedByUserId,
    title:
      input.title
      ?? 'Informe de formación en empresa',
    filters: input,
    summary,
    fileName,
    filePath,
    fileSizeBytes: fileStats.size,
  });

  return {
    message:
      'El informe de formación en empresa se ha generado correctamente.',
    document,
  };
}
