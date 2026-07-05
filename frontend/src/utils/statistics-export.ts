import type {
  AcademicStatisticsMetrics,
  AcademicStatisticsResponse,
  GroupedAcademicStatisticsItem,
} from '../types/statistics';

export interface StatisticsExportMetadata {
  generatedAt: string;
  academicYear: string;
  centre: string;
  evaluation: string;
  vocationalProgramme: string;
  academicLevel: string;
  module: string;
}

type CsvValue = string | number | boolean | null | undefined;

function formatNumber(value: number | null): string {
  if (value === null) {
    return '';
  }

  return value.toLocaleString(
    'es-ES',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

function formatRate(value: number | null): string {
  if (value === null) {
    return '';
  }

  return `${formatNumber(value)} %`;
}

function toCsvCell(value: CsvValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  return `"${String(value).replaceAll('"', '""')}"`;
}

function toCsvRow(values: CsvValue[]): string {
  return values.map(toCsvCell).join(';');
}

function addSection(
  lines: string[],
  title: string,
  headers: string[],
  rows: CsvValue[][],
): void {
  lines.push('');
  lines.push(toCsvRow([title]));
  lines.push(toCsvRow(headers));
  rows.forEach((row) => {
    lines.push(toCsvRow(row));
  });
}

function getMetricsRows(
  metrics: AcademicStatisticsMetrics,
): CsvValue[][] {
  return [
    ['Matriculados', metrics.enrolled],
    ['Registros de calificación', metrics.gradeRecords],
    ['Evaluados', metrics.evaluated],
    ['Evaluados con nota numérica', metrics.numericEvaluated],
    ['Aprobados por estado', metrics.statusPassed],
    ['Aprobados', metrics.passed],
    ['Suspensos', metrics.failed],
    ['No evaluados', metrics.notEvaluated],
    ['No presentados', metrics.noShow],
    ['No evaluables', metrics.nonEvaluable],
    ['Nota media', formatNumber(metrics.averageGrade)],
    ['Nota mínima', formatNumber(metrics.minGrade)],
    ['Nota máxima', formatNumber(metrics.maxGrade)],
    ['Tasa de éxito', formatRate(metrics.successRate)],
    ['Tasa de rendimiento', formatRate(metrics.performanceRate)],
    ['Cobertura', formatRate(metrics.coverageRate)],
  ];
}

function getGroupedRows(
  items: GroupedAcademicStatisticsItem[],
): CsvValue[][] {
  return items.map((item) => [
    item.code,
    item.acronym ?? '',
    item.name,
    item.metrics.enrolled,
    item.metrics.evaluated,
    item.metrics.passed,
    item.metrics.failed,
    item.metrics.notEvaluated,
    item.metrics.noShow,
    item.metrics.nonEvaluable,
    formatNumber(item.metrics.averageGrade),
    formatRate(item.metrics.successRate),
    formatRate(item.metrics.performanceRate),
    formatRate(item.metrics.coverageRate),
  ]);
}

export function buildStatisticsCsv(
  statistics: AcademicStatisticsResponse,
  metadata: StatisticsExportMetadata,
): string {
  const lines: string[] = [];

  lines.push(toCsvRow(['Exportación de estadísticas académicas SAFA Twin']));

  addSection(
    lines,
    'Contexto',
    ['Campo', 'Valor'],
    [
      ['Fecha de generación', metadata.generatedAt],
      ['Curso académico', metadata.academicYear],
      ['Centro', metadata.centre],
      ['Evaluación', metadata.evaluation],
      ['Ciclo formativo', metadata.vocationalProgramme],
      ['Nivel académico', metadata.academicLevel],
      ['Módulo profesional', metadata.module],
    ],
  );

  addSection(
    lines,
    'Resumen general',
    ['Métrica', 'Valor'],
    getMetricsRows(statistics.summary),
  );

  addSection(
    lines,
    'Distribución de notas numéricas',
    ['Tramo', 'Etiqueta', 'Mínimo', 'Máximo', 'Total'],
    statistics.summary.gradeDistribution.map((item) => [
      item.key,
      item.label,
      item.min,
      item.max,
      item.count,
    ]),
  );

  addSection(
    lines,
    'Estados de calificación',
    ['Código', 'Nombre', 'Total', 'Evaluable', 'Aprobado', 'No presentado'],
    statistics.summary.statusDistribution.map((item) => [
      item.code,
      item.name,
      item.count,
      item.isEvaluable ?? '',
      item.countsAsPassed ?? '',
      item.countsAsNoShow ?? '',
    ]),
  );

  const groupedHeaders = [
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

  addSection(lines, 'Comparativa por ciclo', groupedHeaders, getGroupedRows(statistics.byProgramme));
  addSection(lines, 'Comparativa por nivel', groupedHeaders, getGroupedRows(statistics.byLevel));
  addSection(lines, 'Comparativa por módulo', groupedHeaders, getGroupedRows(statistics.byModule));

  if (statistics.warnings.length > 0) {
    addSection(
      lines,
      'Avisos',
      ['Aviso'],
      statistics.warnings.map((warning) => [warning]),
    );
  }

  return lines.join('\r\n');
}

export function buildStatisticsJson(
  statistics: AcademicStatisticsResponse,
  metadata: StatisticsExportMetadata,
): string {
  return JSON.stringify(
    {
      metadata,
      statistics,
    },
    null,
    2,
  );
}

export function buildStatisticsFileBaseName(
  metadata: StatisticsExportMetadata,
): string {
  const clean = (value: string): string => (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
    || 'todos'
  );

  const datePart = metadata.generatedAt
    .slice(0, 10)
    .replaceAll('-', '');

  return [
    'estadisticas',
    datePart,
    clean(metadata.academicYear),
    clean(metadata.evaluation),
    clean(metadata.vocationalProgramme),
    clean(metadata.academicLevel),
    clean(metadata.module),
  ].join('_');
}
