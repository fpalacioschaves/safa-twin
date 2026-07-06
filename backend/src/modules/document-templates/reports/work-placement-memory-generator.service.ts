import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { buildDocxDocument } from '../../../export/docx-writer.js';
import { buildPdfDocument } from '../../../export/pdf-writer.js';
import { prisma } from '../../../config/database.js';

import type { DocumentOutputFormat, DocumentTemplateDefinition } from '../document-template.types.js';
import type { DocumentTemplateGenerationRequest, DocumentTemplateGenerationResult } from '../document-template-generator.service.js';

import { validateDocumentTemplateContext } from '../document-template.service.js';
import { buildWorkPlacementMemory, type WorkPlacementMemoryModel } from './work-placement-memory.service.js';

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

function buildReportLines(report: WorkPlacementMemoryModel): string[] {
  const statusLines = report.statusSummary.length > 0
    ? report.statusSummary.map((status) => `${status.status}: ${status.total}`)
    : ['No hay estados registrados.'];

  const companyLines = report.companySummary.length > 0
    ? report.companySummary.flatMap((company) => [
      company.companyName,
      `Estancias: ${company.placements}`,
      `Alumnos: ${company.students}`,
      `Horas: ${formatNumber(company.completedHours)} / ${formatNumber(company.totalHours)}`,
      `Documentación pendiente: ${company.pendingDocuments}`,
      '',
    ])
    : ['No hay empresas registradas en formación en empresa.'];

  const placementLines = report.placements.length > 0
    ? report.placements.flatMap((placement) => [
      `${placement.studentName} · ${placement.companyName}`,
      `Código alumno: ${placement.studentCode || 'No consta'}`,
      `Centro: ${placement.centreName}`,
      `Estado: ${placement.status}`,
      `Fechas: ${placement.startsAt || 'No indicada'} - ${placement.endsAt || 'No indicada'}`,
      `Horario: ${placement.schedule || 'No consta'}`,
      `Horas: ${formatNumber(placement.completedHours)} / ${formatNumber(placement.totalHours)}`,
      `Tutor empresa: ${placement.companyTutorName || 'No consta'}`,
      `Tutor académico: ${placement.academicTutorName || 'No consta'}`,
      `Documentación pendiente: ${placement.documentationPending ? 'Sí' : 'No'}`,
      `Seguimientos: ${placement.followups}`,
      `Incidencias: ${placement.incidents}`,
      placement.activities ? `Actividades: ${placement.activities}` : '',
      placement.learningOutcomes ? `Resultados de aprendizaje: ${placement.learningOutcomes}` : '',
      placement.finalEvaluation ? `Evaluación final: ${placement.finalEvaluation}` : '',
      placement.remarks ? `Observaciones: ${placement.remarks}` : '',
      '',
    ].filter((line) => line.length > 0))
    : ['No hay estancias de formación en empresa registradas.'];

  const warningLines = report.warnings.length > 0
    ? report.warnings.map((warning) => `- ${warning}`)
    : ['- No se han detectado advertencias automáticas.'];

  return [
    report.title,
    '',
    'Contexto',
    `Curso académico: ${report.academicYear.name}`,
    `Generado: ${report.generatedAt.toISOString()}`,
    '',
    'Resumen general',
    `Estancias registradas: ${report.summary.totalPlacements}`,
    `Alumnos en empresa: ${report.summary.totalStudents}`,
    `Empresas colaboradoras: ${report.summary.totalCompanies}`,
    `Horas completadas / previstas: ${formatNumber(report.summary.completedHours)} / ${formatNumber(report.summary.totalHours)}`,
    `Documentación pendiente: ${report.summary.pendingDocuments}`,
    `Seguimientos registrados: ${report.summary.followups}`,
    `Incidencias registradas: ${report.summary.incidents}`,
    '',
    'Estado de las estancias',
    ...statusLines,
    '',
    'Resumen por empresa',
    ...companyLines,
    'Detalle de estancias',
    ...placementLines,
    'Advertencias y observaciones automáticas',
    ...warningLines,
  ];
}

function renderReportBuffer(report: WorkPlacementMemoryModel): Buffer {
  const lines = buildReportLines(report);

  if (report.outputFormat === 'docx') {
    return buildDocxDocument({ title: report.title, paragraphs: lines });
  }

  return buildPdfDocument({ title: report.title, lines });
}

async function registerGeneratedDocument(userId: number, template: DocumentTemplateDefinition, report: WorkPlacementMemoryModel, fileName: string, filePath: string, fileSizeBytes: number): Promise<number> {
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

async function persistReport(userId: number, template: DocumentTemplateDefinition, report: WorkPlacementMemoryModel, buffer: Buffer): Promise<DocumentTemplateGenerationResult> {
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

export async function generateWorkPlacementMemoryFromTemplate({
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
  const report = await buildWorkPlacementMemory(
    { academicYearId: getRequiredNumber(context, 'academicYearId', 'el curso académico') },
    request.outputFormat,
    generatedAt,
  );

  return persistReport(userId, template, report, renderReportBuffer(report));
}
