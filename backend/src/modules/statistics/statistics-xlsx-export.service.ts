import { randomUUID } from 'node:crypto';
import {
  mkdir,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

import {
  buildXlsxWorkbook,
  type XlsxCellValue,
  type XlsxWorksheet,
} from '../../export/xlsx-writer.js';

import { prisma } from '../../config/database.js';

import type {
  AcademicStatisticsQuery,
} from './statistics.schemas.js';

import {
  getAcademicStatistics,
} from './statistics.service.js';

export const STATISTICS_XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type AcademicStatistics = Awaited<
  ReturnType<typeof getAcademicStatistics>
>;

type Metrics = AcademicStatistics['summary'];

type GroupedItem = AcademicStatistics['byModule'][number];

interface ExportContextLabels {
  academicYear: string;
  centre: string;
  evaluation: string;
  vocationalProgramme: string;
  academicLevel: string;
  module: string;
}

interface ExportContext {
  generatedAt: Date;
  labels: ExportContextLabels;
}

export interface AcademicStatisticsXlsxExportResult {
  buffer: Buffer;
  fileName: string;
  filePath: string;
  mimeType: typeof STATISTICS_XLSX_MIME_TYPE;
  documentId: number;
}

function formatNullableNumber(
  value: number | null,
): XlsxCellValue {
  return value ?? '';
}

function formatNullableRate(
  value: number | null,
): XlsxCellValue {
  return value === null
    ? ''
    : `${value} %`;
}

function getMetricRows(metrics: Metrics): XlsxCellValue[][] {
  return [
    ['Matriculados', metrics.enrolled],
    ['Registros de calificación', metrics.gradeRecords],
    ['Evaluados', metrics.evaluated],
    ['Evaluados con nota numérica', metrics.numericEvaluated],
    ['Aprobados por estado', metrics.statusPassed],
    ['Aprobados', metrics.passed],
    ['Suspensos', metrics.failed],
    ['No evaluados', formatNullableNumber(metrics.notEvaluated)],
    ['No presentados', metrics.noShow],
    ['No evaluables', metrics.nonEvaluable],
    ['Nota media', formatNullableNumber(metrics.averageGrade)],
    ['Nota mínima', formatNullableNumber(metrics.minGrade)],
    ['Nota máxima', formatNullableNumber(metrics.maxGrade)],
    ['Tasa de éxito', formatNullableRate(metrics.successRate)],
    ['Tasa de rendimiento', formatNullableRate(metrics.performanceRate)],
    ['Cobertura de calificación', formatNullableRate(metrics.coverageRate)],
  ];
}

function getGroupedRows(
  items: GroupedItem[],
): XlsxCellValue[][] {
  return items.map((item) => [
    item.code,
    item.acronym ?? '',
    item.name,
    item.metrics.enrolled,
    item.metrics.evaluated,
    item.metrics.passed,
    item.metrics.failed,
    formatNullableNumber(item.metrics.notEvaluated),
    item.metrics.noShow,
    item.metrics.nonEvaluable,
    formatNullableNumber(item.metrics.averageGrade),
    formatNullableRate(item.metrics.successRate),
    formatNullableRate(item.metrics.performanceRate),
    formatNullableRate(item.metrics.coverageRate),
  ]);
}

function getGroupedHeaders(): XlsxCellValue[] {
  return [
    'Código',
    'Acrónimo',
    'Nombre',
    'Matriculados',
    'Evaluados',
    'Aprobados',
    'Suspensos',
    'No evaluados',
    'No presentados',
    'No evaluables',
    'Nota media',
    'Tasa de éxito',
    'Tasa de rendimiento',
    'Cobertura',
  ];
}

function getContextRows(
  context: ExportContext,
  query: AcademicStatisticsQuery,
  statistics: AcademicStatistics,
): XlsxCellValue[][] {
  return [
    ['Informe', 'Estadísticas académicas'],
    ['Generado', context.generatedAt.toISOString()],
    ['Curso académico', context.labels.academicYear],
    ['Centro', context.labels.centre],
    ['Evaluación', context.labels.evaluation],
    ['Ciclo formativo', context.labels.vocationalProgramme],
    ['Nivel académico', context.labels.academicLevel],
    ['Módulo profesional', context.labels.module],
    [],
    ['Filtros técnicos'],
    ['academicYearId', query.academicYearId ?? ''],
    ['centreId', query.centreId ?? ''],
    ['evaluationId', query.evaluationId ?? ''],
    ['vocationalProgrammeId', query.vocationalProgrammeId ?? ''],
    ['academicLevelId', query.academicLevelId ?? ''],
    ['moduleId', query.moduleId ?? ''],
    [],
    ['Avisos'],
    ...(statistics.warnings.length > 0
      ? statistics.warnings.map((warning) => [warning])
      : [['Sin avisos']]),
  ];
}

function buildWorksheets(
  statistics: AcademicStatistics,
  context: ExportContext,
  query: AcademicStatisticsQuery,
): XlsxWorksheet[] {
  return [
    {
      name: 'Contexto',
      rows: getContextRows(
        context,
        query,
        statistics,
      ),
    },
    {
      name: 'Resumen',
      rows: [
        ['Métrica', 'Valor'],
        ...getMetricRows(statistics.summary),
      ],
    },
    {
      name: 'Notas',
      rows: [
        ['Tramo', 'Etiqueta', 'Mínimo', 'Máximo', 'Total'],
        ...statistics.summary.gradeDistribution.map((item) => [
          item.key,
          item.label,
          item.min,
          item.max,
          item.count,
        ]),
      ],
    },
    {
      name: 'Estados',
      rows: [
        [
          'Código',
          'Nombre',
          'Total',
          'Evaluable',
          'Cuenta como aprobado',
          'Cuenta como no presentado',
        ],
        ...statistics.summary.statusDistribution.map((item) => [
          item.code,
          item.name,
          item.count,
          item.isEvaluable ?? '',
          item.countsAsPassed ?? '',
          item.countsAsNoShow ?? '',
        ]),
      ],
    },
    {
      name: 'Ciclos',
      rows: [
        getGroupedHeaders(),
        ...getGroupedRows(statistics.byProgramme),
      ],
    },
    {
      name: 'Niveles',
      rows: [
        getGroupedHeaders(),
        ...getGroupedRows(statistics.byLevel),
      ],
    },
    {
      name: 'Módulos',
      rows: [
        getGroupedHeaders(),
        ...getGroupedRows(statistics.byModule),
      ],
    },
  ];
}

function getLabel<T>(
  item: T | null,
  mapper: (item: T) => string,
): string {
  return item
    ? mapper(item)
    : 'Todos';
}

async function getExportContext(
  query: AcademicStatisticsQuery,
): Promise<ExportContext> {
  const [
    academicYear,
    centre,
    evaluation,
    vocationalProgramme,
    academicLevel,
    module,
  ] = await Promise.all([
    query.academicYearId
      ? prisma.academicYear.findUnique({
        where: { id: query.academicYearId },
        select: { name: true },
      })
      : Promise.resolve(null),
    query.centreId
      ? prisma.centre.findUnique({
        where: { id: query.centreId },
        select: { name: true, shortName: true },
      })
      : Promise.resolve(null),
    query.evaluationId
      ? prisma.evaluation.findUnique({
        where: { id: query.evaluationId },
        select: { code: true, name: true },
      })
      : Promise.resolve(null),
    query.vocationalProgrammeId
      ? prisma.vocationalProgramme.findUnique({
        where: { id: query.vocationalProgrammeId },
        select: { acronym: true, name: true },
      })
      : Promise.resolve(null),
    query.academicLevelId
      ? prisma.academicLevel.findUnique({
        where: { id: query.academicLevelId },
        select: { name: true },
      })
      : Promise.resolve(null),
    query.moduleId
      ? prisma.module.findUnique({
        where: { id: query.moduleId },
        select: { code: true, name: true },
      })
      : Promise.resolve(null),
  ]);

  return {
    generatedAt: new Date(),
    labels: {
      academicYear: getLabel(
        academicYear,
        (item) => item.name,
      ),
      centre: getLabel(
        centre,
        (item) => item.shortName
          ? `${item.shortName} · ${item.name}`
          : item.name,
      ),
      evaluation: getLabel(
        evaluation,
        (item) => `${item.code} · ${item.name}`,
      ),
      vocationalProgramme: getLabel(
        vocationalProgramme,
        (item) => `${item.acronym} · ${item.name}`,
      ),
      academicLevel: getLabel(
        academicLevel,
        (item) => item.name,
      ),
      module: getLabel(
        module,
        (item) => `${item.code} · ${item.name}`,
      ),
    },
  };
}

function sanitizeFilePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    || 'todos';
}

function buildFileName(context: ExportContext): string {
  const timestamp = context.generatedAt
    .toISOString()
    .replaceAll(':', '')
    .replaceAll('.', '')
    .replace('T', '_')
    .replace('Z', '');

  const scope = [
    context.labels.academicYear,
    context.labels.evaluation,
    context.labels.vocationalProgramme,
    context.labels.academicLevel,
    context.labels.module,
  ]
    .map(sanitizeFilePart)
    .join('_')
    .slice(0, 120);

  return `estadisticas_${timestamp}_${scope}_${randomUUID().slice(0, 8)}.xlsx`;
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
      KEY generated_documents_scope_idx (academic_year_id, centre_id, vocational_programme_id, academic_level_id, module_id, evaluation_id),
      CONSTRAINT generated_documents_user_fk
        FOREIGN KEY (generated_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function registerGeneratedDocument({
  userId,
  query,
  context,
  fileName,
  filePath,
  fileSizeBytes,
}: {
  userId: number;
  query: AcademicStatisticsQuery;
  context: ExportContext;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
}): Promise<number> {
  await ensureGeneratedDocumentsTable();

  const parametersJson = JSON.stringify({
    filters: query,
    labels: context.labels,
    generatedAt: context.generatedAt.toISOString(),
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
      ${'ACADEMIC_STATISTICS_XLSX'},
      ${'Exportación XLSX de estadísticas académicas'},
      ${query.academicYearId ?? null},
      ${query.centreId ?? null},
      ${query.vocationalProgrammeId ?? null},
      ${query.academicLevelId ?? null},
      ${query.moduleId ?? null},
      ${query.evaluationId ?? null},
      ${parametersJson},
      ${fileName},
      ${filePath},
      ${STATISTICS_XLSX_MIME_TYPE},
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

export async function generateAcademicStatisticsXlsx(
  query: AcademicStatisticsQuery,
  userId: number,
): Promise<AcademicStatisticsXlsxExportResult> {
  const [statistics, context] = await Promise.all([
    getAcademicStatistics(query),
    getExportContext(query),
  ]);

  const workbookBuffer = buildXlsxWorkbook(
    buildWorksheets(
      statistics,
      context,
      query,
    ),
  );

  const fileName = buildFileName(context);
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
    workbookBuffer,
  );

  const relativeFilePath = path.join(
    'storage',
    'generated-documents',
    fileName,
  ).replaceAll('\\', '/');

  const documentId = await registerGeneratedDocument({
    userId,
    query,
    context,
    fileName,
    filePath: relativeFilePath,
    fileSizeBytes: workbookBuffer.length,
  });

  return {
    buffer: workbookBuffer,
    fileName,
    filePath: relativeFilePath,
    mimeType: STATISTICS_XLSX_MIME_TYPE,
    documentId,
  };
}
