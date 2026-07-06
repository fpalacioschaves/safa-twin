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
  buildFinalMemoryProgrammeLevel,
  type FinalMemoryModel,
} from './final-memory-programme-level.service.js';

const MIME_TYPES: Record<DocumentOutputFormat, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
};

function getRequiredNumber(
  context: Record<string, unknown>,
  key: string,
  label: string,
): number {
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

function getCentresText(report: FinalMemoryModel): string {
  if (report.centres.length === 0) {
    return 'No consta centro asociado a matrículas.';
  }

  return report.centres
    .map((centre) => centre.shortName || centre.name)
    .join(', ');
}

function buildReportLines(report: FinalMemoryModel): string[] {
  const evaluationLines = report.evaluations.length > 0
    ? report.evaluations.map((evaluation) => `${evaluation.sequence}. ${evaluation.code} · ${evaluation.name} · ${evaluation.status}`)
    : ['No hay evaluaciones registradas para el curso académico.'];

  const statusLines = report.statusSummary.length > 0
    ? report.statusSummary.map((status) => `${status.statusCode} · ${status.statusName}: ${status.total}`)
    : ['No hay estados o calificaciones registradas.'];

  const moduleLines = report.moduleSummaries.length > 0
    ? report.moduleSummaries.flatMap((moduleSummary) => [
      `${moduleSummary.moduleCode} · ${moduleSummary.moduleName}`,
      `   Matriculados: ${moduleSummary.moduleEnrolments}`,
      `   Evaluados: ${moduleSummary.evaluated}`,
      `   Aprobados: ${moduleSummary.passed}`,
      `   Suspensos: ${moduleSummary.failed}`,
      `   No evaluados: ${moduleSummary.notEvaluated}`,
      `   Nota media: ${formatNumber(moduleSummary.averageGrade)}`,
      `   Tasa de éxito: ${formatPercentage(moduleSummary.successRate)}`,
      `   Tasa de rendimiento: ${formatPercentage(moduleSummary.performanceRate)}`,
      '',
    ])
    : ['No hay módulos activos para el ciclo y curso seleccionados.'];

  const warningLines = report.warnings.length > 0
    ? report.warnings.map((warning) => `- ${warning}`)
    : ['- No se han detectado advertencias automáticas.'];

  return [
    report.title,
    '',
    'Contexto académico',
    `Curso académico: ${report.academicYear.name}`,
    `Ciclo formativo: ${report.programme.acronym} · ${report.programme.name}`,
    `Curso / nivel: ${report.level.name}`,
    `Centro(s): ${getCentresText(report)}`,
    `Generado: ${report.generatedAt.toISOString()}`,
    '',
    'Criterio de cálculo',
    report.methodologyNote,
    '',
    'Evaluaciones registradas',
    ...evaluationLines,
    '',
    'Resumen general',
    `Módulos del curso: ${report.summary.modules}`,
    `Alumnos distintos matriculados: ${report.summary.enrolledStudents}`,
    `Matrículas modulares: ${report.summary.moduleEnrolments}`,
    `Evaluados con nota numérica: ${report.summary.evaluated}`,
    `Aprobados: ${report.summary.passed}`,
    `Suspensos: ${report.summary.failed}`,
    `No evaluados / sin calificación numérica: ${report.summary.notEvaluated}`,
    `Nota media global: ${formatNumber(report.summary.averageGrade)}`,
    `Tasa de éxito global: ${formatPercentage(report.summary.successRate)}`,
    `Tasa de rendimiento global: ${formatPercentage(report.summary.performanceRate)}`,
    '',
    'Estados y situaciones',
    ...statusLines,
    '',
    'Resultados por módulo',
    ...moduleLines,
    'Advertencias y observaciones automáticas',
    ...warningLines,
  ];
}

function renderReportBuffer(report: FinalMemoryModel): Buffer {
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

async function registerGeneratedDocument(
  userId: number,
  template: DocumentTemplateDefinition,
  report: FinalMemoryModel,
  fileName: string,
  filePath: string,
  fileSizeBytes: number,
): Promise<number> {
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
      ${report.centres[0]?.id ?? null},
      ${report.programme.id},
      ${report.level.id},
      ${null},
      ${null},
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

async function persistReport(
  userId: number,
  template: DocumentTemplateDefinition,
  report: FinalMemoryModel,
  buffer: Buffer,
): Promise<DocumentTemplateGenerationResult> {
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

  const documentId = await registerGeneratedDocument(
    userId,
    template,
    report,
    fileName,
    relativeFilePath,
    buffer.length,
  );

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

export async function generateFinalMemoryProgrammeLevelFromTemplate({
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
  const generatedAt = new Date();
  const report = await buildFinalMemoryProgrammeLevel(
    {
      academicYearId: getRequiredNumber(context, 'academicYearId', 'el curso académico'),
      vocationalProgrammeId: getRequiredNumber(context, 'vocationalProgrammeId', 'el ciclo formativo'),
      academicLevelId: getRequiredNumber(context, 'academicLevelId', 'el curso o nivel'),
    },
    request.outputFormat,
    generatedAt,
  );

  return persistReport(
    userId,
    template,
    report,
    renderReportBuffer(report),
  );
}
