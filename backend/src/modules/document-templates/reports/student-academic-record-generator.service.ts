import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { buildDocxDocument } from '../../../export/docx-writer.js';
import { buildPdfDocument } from '../../../export/pdf-writer.js';
import { prisma } from '../../../config/database.js';

import type { DocumentOutputFormat, DocumentTemplateDefinition } from '../document-template.types.js';
import type { DocumentTemplateGenerationRequest, DocumentTemplateGenerationResult } from '../document-template-generator.service.js';

import { validateDocumentTemplateContext } from '../document-template.service.js';
import { buildStudentAcademicRecord, type StudentAcademicRecordModel } from './student-academic-record.service.js';

const MIME_TYPES: Record<DocumentOutputFormat, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
};

function getRequiredNumber(context: Record<string, unknown>, key: string, label: string): number {
  const value = context[key];

  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }

  throw new Error(`Debes seleccionar ${label}.`);
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

function buildFileName(template: DocumentTemplateDefinition, format: DocumentOutputFormat, generatedAt: Date): string {
  const timestamp = generatedAt
    .toISOString()
    .replaceAll(':', '')
    .replaceAll('.', '')
    .replace('T', '_')
    .replace('Z', '');

  return `${sanitizeFilePart(template.code)}_${timestamp}_${randomUUID().slice(0, 8)}.${format}`;
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

function buildReportLines(report: StudentAcademicRecordModel): string[] {
  const enrolmentLines = report.enrolments.length > 0
    ? report.enrolments.flatMap((enrolment) => [
      `${enrolment.academicYearName} · ${enrolment.moduleCode} · ${enrolment.moduleName}`,
      `Centro: ${enrolment.centreName}`,
      `Ciclo: ${enrolment.programmeAcronym} · ${enrolment.programmeName}`,
      `Curso / nivel: ${enrolment.levelName}`,
      `Estado matrícula: ${enrolment.status}`,
      `Fecha matrícula: ${enrolment.enrolledAt}`,
      '',
    ])
    : ['No hay matrículas registradas.'];

  const latestGradeLines = report.latestGrades.length > 0
    ? report.latestGrades.flatMap((grade) => [
      `${grade.academicYearName} · ${grade.moduleCode} · ${grade.moduleName}`,
      `Última evaluación: ${grade.evaluationName}`,
      `Nota: ${formatNumber(grade.finalGrade ?? grade.numericGrade)}`,
      `Estado: ${grade.statusCode} · ${grade.statusName}`,
      `Aprobado: ${formatYesNo(grade.isPassed)}`,
      '',
    ])
    : ['No hay calificaciones registradas.'];

  const placementLines = report.workPlacements.length > 0
    ? report.workPlacements.flatMap((placement) => [
      `${placement.academicYearName} · ${placement.companyName}`,
      `Estado: ${placement.status}`,
      `Fechas: ${placement.startsAt || 'No indicada'} - ${placement.endsAt || 'No indicada'}`,
      `Horas: ${formatNumber(placement.completedHours)} / ${formatNumber(placement.totalHours)}`,
      `Tutor empresa: ${placement.companyTutorName || 'No consta'}`,
      `Tutor académico: ${placement.academicTutorName || 'No consta'}`,
      `Documentación pendiente: ${placement.documentationPending ? 'Sí' : 'No'}`,
      `Seguimientos: ${placement.followups}`,
      `Incidencias: ${placement.incidents}`,
      '',
    ])
    : ['No hay formación en empresa registrada.'];

  const warningLines = report.warnings.length > 0
    ? report.warnings.map((warning) => `- ${warning}`)
    : ['- No se han detectado advertencias automáticas.'];

  return [
    report.title,
    '',
    'Datos del alumno',
    `Alumno: ${report.student.fullName}`,
    `Código: ${report.student.code || 'No consta'}`,
    `Documento: ${report.student.documentType || 'No consta'} ${report.student.documentNumber || ''}`.trim(),
    `Email: ${report.student.email || 'No consta'}`,
    `Teléfono: ${report.student.phone || 'No consta'}`,
    `Localidad: ${report.student.city || 'No consta'} ${report.student.province || ''}`.trim(),
    `Activo: ${report.student.isActive ? 'Sí' : 'No'}`,
    `Generado: ${report.generatedAt.toISOString()}`,
    '',
    'Resumen académico',
    `Módulos matriculados: ${report.summary.moduleEnrolments}`,
    `Evaluados con nota numérica: ${report.summary.evaluated}`,
    `Aprobados: ${report.summary.passed}`,
    `Suspensos: ${report.summary.failed}`,
    `No evaluados / sin calificación numérica: ${report.summary.notEvaluated}`,
    `Nota media: ${formatNumber(report.summary.averageGrade)}`,
    `Tasa de rendimiento personal: ${formatPercentage(report.summary.performanceRate)}`,
    '',
    'Matrículas',
    ...enrolmentLines,
    'Última situación académica por módulo',
    ...latestGradeLines,
    'Formación en empresa',
    ...placementLines,
    'Advertencias y observaciones automáticas',
    ...warningLines,
  ];
}

function renderReportBuffer(report: StudentAcademicRecordModel): Buffer {
  const lines = buildReportLines(report);

  if (report.outputFormat === 'docx') {
    return buildDocxDocument({ title: report.title, paragraphs: lines });
  }

  return buildPdfDocument({ title: report.title, lines });
}

async function registerGeneratedDocument(userId: number, template: DocumentTemplateDefinition, report: StudentAcademicRecordModel, fileName: string, filePath: string, fileSizeBytes: number): Promise<number> {
  const parametersJson = JSON.stringify({
    templateCode: template.code,
    templateName: template.name,
    outputFormat: report.outputFormat,
    context: report.context,
    generatedAt: report.generatedAt.toISOString(),
    studentId: report.student.id,
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
      ${null},
      ${null},
      ${null},
      ${null},
      ${null},
      ${null},
      ${parametersJson},
      ${fileName},
      ${filePath},
      ${MIME_TYPES[report.outputFormat]},
      ${fileSizeBytes}
    )
  `;

  const rows = await prisma.$queryRaw<Array<{ id: bigint | number }>>`
    SELECT id
    FROM generated_documents
    WHERE file_path = ${filePath}
    LIMIT 1
  `;

  return Number(rows[0]?.id ?? 0);
}

async function persistReport(userId: number, template: DocumentTemplateDefinition, report: StudentAcademicRecordModel, buffer: Buffer): Promise<DocumentTemplateGenerationResult> {
  const fileName = buildFileName(template, report.outputFormat, report.generatedAt);
  const storageDirectory = path.join(process.cwd(), 'storage', 'generated-documents');

  await mkdir(storageDirectory, { recursive: true });

  const absoluteFilePath = path.join(storageDirectory, fileName);

  await writeFile(absoluteFilePath, buffer);

  const relativeFilePath = path.join('storage', 'generated-documents', fileName).replaceAll('\\', '/');
  const documentId = await registerGeneratedDocument(userId, template, report, fileName, relativeFilePath, buffer.length);

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

export async function generateStudentAcademicRecordFromTemplate({
  template,
  request,
  userId,
}: {
  template: DocumentTemplateDefinition;
  request: DocumentTemplateGenerationRequest;
  userId: number;
}): Promise<DocumentTemplateGenerationResult> {
  const validation = validateDocumentTemplateContext(template.code, {
    outputFormat: request.outputFormat,
    context: request.context,
  });

  if (!validation || !validation.valid) {
    const message = validation?.issues.map((issue) => issue.message).join(' ')
      || 'No se puede generar el documento con los datos enviados.';

    throw new Error(message);
  }

  const context = request.context ?? {};
  const generatedAt = new Date();
  const report = await buildStudentAcademicRecord(
    { studentId: getRequiredNumber(context, 'studentId', 'el alumno') },
    request.outputFormat,
    generatedAt,
  );

  return persistReport(userId, template, report, renderReportBuffer(report));
}
