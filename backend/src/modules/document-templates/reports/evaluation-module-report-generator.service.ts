import { randomUUID } from 'node:crypto';
import {
  mkdir,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

import {
  buildDocxDocument,
} from '../../../export/docx-writer.js';
import {
  buildPdfDocument,
} from '../../../export/pdf-writer.js';
import {
  buildXlsxWorkbook,
  type XlsxCellValue,
  type XlsxWorksheet,
} from '../../../export/xlsx-writer.js';
import { prisma } from '../../../config/database.js';

import type {
  DocumentOutputFormat,
  DocumentTemplateDefinition,
} from '../document-template.types.js';

import type {
  DocumentTemplateGenerationRequest,
  DocumentTemplateGenerationResult,
} from '../document-template-generator.service.js';

import {
  validateDocumentTemplateContext,
} from '../document-template.service.js';

import {
  buildEvaluationModuleReport,
  type EvaluationModuleReportModel,
} from './evaluation-module-report.service.js';

const MIME_TYPES: Record<DocumentOutputFormat, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
};

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'number'
    || typeof value === 'boolean'
  ) {
    return String(value);
  }

  return JSON.stringify(value);
}

function escapeCsvCell(value: unknown): string {
  const text = stringifyValue(value);

  if (
    text.includes(';')
    || text.includes('"')
    || text.includes('\n')
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function sanitizeFilePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    || 'documento';
}

function buildFileName(
  template: DocumentTemplateDefinition,
  format: DocumentOutputFormat,
  generatedAt: Date,
): string {
  const timestamp = generatedAt
    .toISOString()
    .replaceAll(':', '')
    .replaceAll('.', '')
    .replace('T', '_')
    .replace('Z', '');

  return `${sanitizeFilePart(template.code)}_${timestamp}_${randomUUID().slice(0, 8)}.${format}`;
}

function getOptionalNumber(
  context: Record<string, unknown>,
  key: string,
): number | null {
  const value = context[key];

  if (
    typeof value === 'number'
    && Number.isInteger(value)
  ) {
    return value;
  }

  if (
    typeof value === 'string'
    && /^\d+$/.test(value.trim())
  ) {
    return Number(value.trim());
  }

  return null;
}

function getRequiredNumber(
  context: Record<string, unknown>,
  key: string,
  label: string,
): number {
  const value = getOptionalNumber(
    context,
    key,
  );

  if (value === null) {
    throw new Error(`Debes seleccionar ${label}.`);
  }

  return value;
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) {
    return '—';
  }

  return value.toLocaleString('es-ES', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

function formatPercentage(value: number): string {
  return `${value.toLocaleString('es-ES', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })} %`;
}

function formatYesNo(value: boolean | null): string {
  if (value === null) {
    return 'No consta';
  }

  return value ? 'Sí' : 'No';
}

function buildReportLines(report: EvaluationModuleReportModel): string[] {
  const statusLines = report.statusSummary.length > 0
    ? report.statusSummary.map((status) => `${status.statusCode} · ${status.statusName}: ${status.total}`)
    : ['No hay estados registrados.'];

  const warningLines = report.warnings.length > 0
    ? report.warnings.map((warning) => `- ${warning}`)
    : ['- No se han detectado advertencias automáticas.'];

  const studentLines = report.students.length > 0
    ? report.students.flatMap((student, index) => [
      `${index + 1}. ${student.studentName}`,
      `   Código: ${student.studentCode || 'No consta'}`,
      `   Matrícula: ${student.enrolmentStatus}`,
      `   Nota numérica: ${formatNumber(student.numericGrade)}`,
      `   Nota final: ${formatNumber(student.finalGrade)}`,
      `   Estado: ${student.statusCode} · ${student.statusName}`,
      `   Aprobado: ${formatYesNo(student.isPassed)}`,
      student.remarks ? `   Observaciones: ${student.remarks}` : '',
      '',
    ].filter((line) => line.length > 0))
    : ['No hay alumnado matriculado en este módulo para el curso de la evaluación.'];

  return [
    report.title,
    '',
    'Contexto académico',
    `Curso académico: ${report.academicYear.name}`,
    `Centro: ${report.centre.shortName || report.centre.name}`,
    `Evaluación: ${report.evaluation.code} · ${report.evaluation.name}`,
    `Estado de evaluación: ${report.evaluation.status}`,
    `Periodo de evaluación: ${report.evaluation.startsAt || 'No indicado'} - ${report.evaluation.endsAt || 'No indicado'}`,
    `Módulo: ${report.module.code} · ${report.module.name}`,
    `Ciclo: ${report.module.programmeAcronym} · ${report.module.programmeName}`,
    `Curso / nivel: ${report.module.levelName}`,
    `Generado: ${report.generatedAt.toISOString()}`,
    '',
    'Resumen académico',
    `Matriculados: ${report.summary.enrolled}`,
    `Con calificación o estado registrado: ${report.summary.graded}`,
    `Evaluados con nota numérica: ${report.summary.evaluated}`,
    `Aprobados: ${report.summary.passed}`,
    `Suspensos: ${report.summary.failed}`,
    `No evaluados / sin calificación numérica: ${report.summary.notEvaluated}`,
    `Nota media: ${formatNumber(report.summary.averageGrade)}`,
    `Tasa de éxito: ${formatPercentage(report.summary.successRate)}`,
    `Tasa de rendimiento: ${formatPercentage(report.summary.performanceRate)}`,
    '',
    'Estados y situaciones',
    ...statusLines,
    '',
    'Advertencias',
    ...warningLines,
    '',
    'Detalle de alumnado',
    ...studentLines,
  ];
}

function buildJsonBuffer(report: EvaluationModuleReportModel): Buffer {
  return Buffer.from(
    JSON.stringify(
      report,
      null,
      2,
    ),
    'utf8',
  );
}

function buildCsvBuffer(report: EvaluationModuleReportModel): Buffer {
  const rows: string[][] = [
    ['Alumno', 'Código', 'Matrícula', 'Nota numérica', 'Nota final', 'Estado', 'Aprobado', 'Observaciones'],
    ...report.students.map((student) => [
      student.studentName,
      student.studentCode,
      student.enrolmentStatus,
      formatNumber(student.numericGrade),
      formatNumber(student.finalGrade),
      `${student.statusCode} · ${student.statusName}`,
      formatYesNo(student.isPassed),
      student.remarks,
    ]),
  ];

  return Buffer.from(
    `\ufeff${rows.map((row) => row.map(escapeCsvCell).join(';')).join('\n')}`,
    'utf8',
  );
}

function buildXlsxWorksheets(report: EvaluationModuleReportModel): XlsxWorksheet[] {
  const summaryRows: XlsxCellValue[][] = [
    ['Campo', 'Valor'],
    ['Curso académico', report.academicYear.name],
    ['Centro', report.centre.shortName || report.centre.name],
    ['Evaluación', `${report.evaluation.code} · ${report.evaluation.name}`],
    ['Estado de evaluación', report.evaluation.status],
    ['Módulo', `${report.module.code} · ${report.module.name}`],
    ['Ciclo', `${report.module.programmeAcronym} · ${report.module.programmeName}`],
    ['Curso / nivel', report.module.levelName],
    ['Generado', report.generatedAt.toISOString()],
    [],
    ['Indicador', 'Valor'],
    ['Matriculados', report.summary.enrolled],
    ['Con calificación o estado registrado', report.summary.graded],
    ['Evaluados con nota numérica', report.summary.evaluated],
    ['Aprobados', report.summary.passed],
    ['Suspensos', report.summary.failed],
    ['No evaluados / sin calificación numérica', report.summary.notEvaluated],
    ['Nota media', report.summary.averageGrade],
    ['Tasa de éxito', report.summary.successRate],
    ['Tasa de rendimiento', report.summary.performanceRate],
  ];

  const statusRows: XlsxCellValue[][] = [
    ['Estado', 'Nombre', 'Total'],
    ...report.statusSummary.map((status) => [
      status.statusCode,
      status.statusName,
      status.total,
    ]),
  ];

  const studentRows: XlsxCellValue[][] = [
    ['Alumno', 'Código', 'Matrícula', 'Nota numérica', 'Nota final', 'Estado', 'Estado descriptivo', 'Aprobado', 'Observaciones'],
    ...report.students.map((student) => [
      student.studentName,
      student.studentCode,
      student.enrolmentStatus,
      student.numericGrade,
      student.finalGrade,
      student.statusCode,
      student.statusName,
      formatYesNo(student.isPassed),
      student.remarks,
    ]),
  ];

  return [
    {
      name: 'Resumen',
      rows: summaryRows,
    },
    {
      name: 'Estados',
      rows: statusRows,
    },
    {
      name: 'Alumnado',
      rows: studentRows,
    },
  ];
}

function renderReportBuffer(report: EvaluationModuleReportModel): Buffer {
  if (report.outputFormat === 'json') {
    return buildJsonBuffer(report);
  }

  if (report.outputFormat === 'csv') {
    return buildCsvBuffer(report);
  }

  if (report.outputFormat === 'xlsx') {
    return buildXlsxWorkbook(buildXlsxWorksheets(report));
  }

  const lines = buildReportLines(report);

  if (report.outputFormat === 'docx') {
    return buildDocxDocument({
      title: report.title,
      paragraphs: lines,
    });
  }

  return buildPdfDocument({
    title: report.title,
    lines,
  });
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

async function registerGeneratedDocument({
  userId,
  template,
  report,
  fileName,
  filePath,
  fileSizeBytes,
}: {
  userId: number;
  template: DocumentTemplateDefinition;
  report: EvaluationModuleReportModel;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
}): Promise<number> {
  await ensureGeneratedDocumentsTable();

  const parametersJson = JSON.stringify({
    templateCode: template.code,
    templateName: template.name,
    outputFormat: report.outputFormat,
    context: report.context,
    generatedAt: report.generatedAt.toISOString(),
    summary: report.summary,
  });

  await prisma.$executeRaw`
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
    ) VALUES (
      ${userId},
      ${`DOCUMENT_TEMPLATE_${report.outputFormat.toUpperCase()}`},
      ${template.name},
      ${report.academicYear.id},
      ${report.centre.id},
      ${report.module.programmeId},
      ${report.module.levelId},
      ${report.module.id},
      ${report.evaluation.id},
      ${parametersJson},
      ${fileName},
      ${filePath},
      ${MIME_TYPES[report.outputFormat]},
      ${fileSizeBytes}
    )
  `;

  const rows = await prisma.$queryRaw<Array<{
    id: bigint | number;
  }>>`
    SELECT id
    FROM generated_documents
    WHERE file_path = ${filePath}
    LIMIT 1
  `;

  return Number(rows[0]?.id ?? 0);
}

async function persistReport({
  template,
  report,
  userId,
  buffer,
}: {
  template: DocumentTemplateDefinition;
  report: EvaluationModuleReportModel;
  userId: number;
  buffer: Buffer;
}): Promise<DocumentTemplateGenerationResult> {
  const fileName = buildFileName(
    template,
    report.outputFormat,
    report.generatedAt,
  );
  const storageDirectory = path.join(
    process.cwd(),
    'storage',
    'generated-documents',
  );

  await mkdir(
    storageDirectory,
    {
      recursive: true,
    },
  );

  const absoluteFilePath = path.join(
    storageDirectory,
    fileName,
  );

  await writeFile(
    absoluteFilePath,
    buffer,
  );

  const relativeFilePath = path.join(
    'storage',
    'generated-documents',
    fileName,
  ).replaceAll('\\', '/');

  const documentId = await registerGeneratedDocument({
    userId,
    template,
    report,
    fileName,
    filePath: relativeFilePath,
    fileSizeBytes: buffer.length,
  });

  return {
    documentId,
    templateCode: template.code,
    templateName: template.name,
    outputFormat: report.outputFormat,
    fileName,
    filePath: relativeFilePath,
    mimeType: MIME_TYPES[report.outputFormat],
    fileSizeBytes: buffer.length,
    downloadUrl: `/api/generated-documents/${documentId}/download`,
    generatedAt: report.generatedAt.toISOString(),
  };
}

export async function generateEvaluationModuleReportFromTemplate({
  template,
  request,
  userId,
}: {
  template: DocumentTemplateDefinition;
  request: DocumentTemplateGenerationRequest;
  userId: number;
}): Promise<DocumentTemplateGenerationResult> {
  const validation = validateDocumentTemplateContext(
    template.code,
    {
      outputFormat: request.outputFormat,
      context: request.context,
    },
  );

  if (!validation || !validation.valid) {
    const message = validation?.issues
      .map((issue) => issue.message)
      .join(' ')
      || 'No se puede generar el documento con los datos enviados.';

    throw new Error(message);
  }

  const context = request.context ?? {};
  const evaluationId = getRequiredNumber(
    context,
    'evaluationId',
    'la evaluación',
  );
  const moduleId = getRequiredNumber(
    context,
    'moduleId',
    'el módulo',
  );
  const generatedAt = new Date();

  const report = await buildEvaluationModuleReport(
    {
      evaluationId,
      moduleId,
    },
    request.outputFormat,
    generatedAt,
  );

  const buffer = renderReportBuffer(report);

  return persistReport({
    template,
    report,
    userId,
    buffer,
  });
}
