import { randomUUID } from 'node:crypto';
import {
  mkdir,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

import {
  buildDocxDocument,
} from '../../export/docx-writer.js';
import {
  buildPdfDocument,
} from '../../export/pdf-writer.js';
import {
  buildXlsxWorkbook,
  type XlsxCellValue,
  type XlsxWorksheet,
} from '../../export/xlsx-writer.js';
import { prisma } from '../../config/database.js';

import type {
  DocumentOutputFormat,
  DocumentTemplateDefinition,
  DocumentTemplateInputDefinition,
} from './document-template.types.js';

import {
  getDocumentTemplateByCode,
  validateDocumentTemplateContext,
} from './document-template.service.js';

const MIME_TYPES: Record<DocumentOutputFormat, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
};

export interface DocumentTemplateGenerationRequest {
  outputFormat: DocumentOutputFormat;
  context?: Record<string, unknown>;
}

export interface DocumentTemplateGenerationResult {
  documentId: number;
  templateCode: string;
  templateName: string;
  outputFormat: DocumentOutputFormat;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSizeBytes: number;
  downloadUrl: string;
  generatedAt: string;
}

interface DocumentRenderModel {
  template: DocumentTemplateDefinition;
  generatedAt: Date;
  outputFormat: DocumentOutputFormat;
  context: Record<string, unknown>;
  resolvedInputs: Array<{
    input: DocumentTemplateInputDefinition;
    value: unknown;
  }>;
}

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

function sanitizeFilePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    || 'documento';
}

function getExtension(format: DocumentOutputFormat): string {
  return format;
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

  const templatePart = sanitizeFilePart(template.code);
  const randomPart = randomUUID().slice(0, 8);

  return `${templatePart}_${timestamp}_${randomPart}.${getExtension(format)}`;
}

function buildPlainTextLines(model: DocumentRenderModel): string[] {
  const requiredInputLines = model.resolvedInputs.map(({ input, value }) =>
    `${input.label}: ${stringifyValue(value) || 'No indicado'}`,
  );

  const sectionLines = model.template.sections
    .slice()
    .sort((first, second) => first.order - second.order)
    .flatMap((section) => [
      `Sección ${section.order}: ${section.title}`,
      section.description,
      `Tipo: ${section.required ? 'Obligatoria' : 'Opcional'}`,
      `Variables: ${section.variables.length > 0 ? section.variables.join(', ') : 'Sin variables declaradas'}`,
      '',
    ]);

  const variableLines = model.template.variables.flatMap((variable) => [
    `${variable.key} · ${variable.label}`,
    `Tipo: ${variable.type} · ${variable.required ? 'Obligatoria' : 'Opcional'}`,
    variable.description,
    '',
  ]);

  return [
    `Plantilla: ${model.template.name}`,
    `Código: ${model.template.code}`,
    `Categoría: ${model.template.category}`,
    `Formato: ${model.outputFormat.toUpperCase()}`,
    `Generado: ${model.generatedAt.toISOString()}`,
    '',
    'Descripción',
    model.template.description,
    '',
    'Datos de contexto',
    ...(requiredInputLines.length > 0
      ? requiredInputLines
      : ['La plantilla no declara datos obligatorios.']),
    '',
    'Secciones',
    ...sectionLines,
    'Variables disponibles',
    ...variableLines,
  ];
}

function buildJsonBuffer(model: DocumentRenderModel): Buffer {
  return Buffer.from(
    JSON.stringify(
      {
        generatedAt: model.generatedAt.toISOString(),
        template: model.template,
        outputFormat: model.outputFormat,
        context: model.context,
        resolvedInputs: model.resolvedInputs.map(({ input, value }) => ({
          key: input.key,
          label: input.label,
          required: input.required,
          value,
        })),
      },
      null,
      2,
    ),
    'utf8',
  );
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

function buildCsvBuffer(model: DocumentRenderModel): Buffer {
  const rows: string[][] = [
    ['Tipo', 'Campo', 'Valor'],
    ['Plantilla', 'Código', model.template.code],
    ['Plantilla', 'Nombre', model.template.name],
    ['Plantilla', 'Categoría', model.template.category],
    ['Plantilla', 'Descripción', model.template.description],
    ['Generación', 'Formato', model.outputFormat],
    ['Generación', 'Fecha', model.generatedAt.toISOString()],
    ...model.resolvedInputs.map(({ input, value }) => [
      'Contexto',
      input.label,
      stringifyValue(value),
    ]),
    ...model.template.sections.map((section) => [
      'Sección',
      `${section.order}. ${section.title}`,
      section.description,
    ]),
    ...model.template.variables.map((variable) => [
      'Variable',
      variable.key,
      `${variable.label} · ${variable.type}`,
    ]),
  ];

  const csv = rows
    .map((row) => row.map(escapeCsvCell).join(';'))
    .join('\n');

  return Buffer.from(
    `\ufeff${csv}`,
    'utf8',
  );
}

function buildXlsxWorksheets(model: DocumentRenderModel): XlsxWorksheet[] {
  const contextRows: XlsxCellValue[][] = [
    ['Campo', 'Valor'],
    ['Código de plantilla', model.template.code],
    ['Nombre de plantilla', model.template.name],
    ['Categoría', model.template.category],
    ['Formato', model.outputFormat],
    ['Generado', model.generatedAt.toISOString()],
    [],
    ['Datos obligatorios', 'Valor'],
    ...model.resolvedInputs.map(({ input, value }) => [
      input.label,
      stringifyValue(value),
    ]),
  ];

  const sectionsRows: XlsxCellValue[][] = [
    ['Orden', 'Clave', 'Título', 'Obligatoria', 'Descripción', 'Variables'],
    ...model.template.sections
      .slice()
      .sort((first, second) => first.order - second.order)
      .map((section) => [
        section.order,
        section.key,
        section.title,
        section.required,
        section.description,
        section.variables.join(', '),
      ]),
  ];

  const variableRows: XlsxCellValue[][] = [
    ['Clave', 'Etiqueta', 'Tipo', 'Obligatoria', 'Descripción', 'Ejemplo'],
    ...model.template.variables.map((variable) => [
      variable.key,
      variable.label,
      variable.type,
      variable.required,
      variable.description,
      variable.example ?? '',
    ]),
  ];

  return [
    {
      name: 'Contexto',
      rows: contextRows,
    },
    {
      name: 'Secciones',
      rows: sectionsRows,
    },
    {
      name: 'Variables',
      rows: variableRows,
    },
  ];
}

function renderDocumentBuffer(model: DocumentRenderModel): Buffer {
  if (model.outputFormat === 'json') {
    return buildJsonBuffer(model);
  }

  if (model.outputFormat === 'csv') {
    return buildCsvBuffer(model);
  }

  if (model.outputFormat === 'xlsx') {
    return buildXlsxWorkbook(
      buildXlsxWorksheets(model),
    );
  }

  const lines = buildPlainTextLines(model);

  if (model.outputFormat === 'docx') {
    return buildDocxDocument({
      title: model.template.name,
      paragraphs: lines,
    });
  }

  return buildPdfDocument({
    title: model.template.name,
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

async function registerGeneratedDocument({
  userId,
  model,
  fileName,
  filePath,
  fileSizeBytes,
}: {
  userId: number;
  model: DocumentRenderModel;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
}): Promise<number> {
  await ensureGeneratedDocumentsTable();

  const parametersJson = JSON.stringify({
    templateCode: model.template.code,
    templateName: model.template.name,
    outputFormat: model.outputFormat,
    context: model.context,
    generatedAt: model.generatedAt.toISOString(),
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
      ${`DOCUMENT_TEMPLATE_${model.outputFormat.toUpperCase()}`},
      ${model.template.name},
      ${getOptionalNumber(model.context, 'academicYearId')},
      ${getOptionalNumber(model.context, 'centreId')},
      ${getOptionalNumber(model.context, 'vocationalProgrammeId')},
      ${getOptionalNumber(model.context, 'academicLevelId')},
      ${getOptionalNumber(model.context, 'moduleId')},
      ${getOptionalNumber(model.context, 'evaluationId')},
      ${parametersJson},
      ${fileName},
      ${filePath},
      ${MIME_TYPES[model.outputFormat]},
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

export async function generateDocumentFromTemplate(
  code: string,
  request: DocumentTemplateGenerationRequest,
  userId: number,
): Promise<DocumentTemplateGenerationResult | null> {
  const template = getDocumentTemplateByCode(code);

  if (!template) {
    return null;
  }

  const validation = validateDocumentTemplateContext(
    code,
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

  const generatedAt = new Date();
  const context = request.context ?? {};
  const model: DocumentRenderModel = {
    template,
    generatedAt,
    outputFormat: request.outputFormat,
    context,
    resolvedInputs: template.requiredInputs.map((input) => ({
      input,
      value: context[input.key],
    })),
  };

  const buffer = renderDocumentBuffer(model);
  const fileName = buildFileName(
    template,
    request.outputFormat,
    generatedAt,
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
    model,
    fileName,
    filePath: relativeFilePath,
    fileSizeBytes: buffer.length,
  });

  return {
    documentId,
    templateCode: template.code,
    templateName: template.name,
    outputFormat: request.outputFormat,
    fileName,
    filePath: relativeFilePath,
    mimeType: MIME_TYPES[request.outputFormat],
    fileSizeBytes: buffer.length,
    downloadUrl: `/api/generated-documents/${documentId}/download`,
    generatedAt: generatedAt.toISOString(),
  };
}
