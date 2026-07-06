import { prisma } from '../../../config/database.js';
import type {
  DocumentOutputFormat,
} from '../document-template.types.js';

export interface FinalMemoryProgrammeLevelContext {
  academicYearId: number;
  vocationalProgrammeId: number;
  academicLevelId: number;
}

export interface FinalMemorySummary {
  modules: number;
  enrolledStudents: number;
  moduleEnrolments: number;
  evaluated: number;
  passed: number;
  failed: number;
  notEvaluated: number;
  successRate: number;
  performanceRate: number;
  averageGrade: number | null;
}

export interface FinalMemoryModuleSummary extends FinalMemorySummary {
  moduleId: number;
  moduleCode: string;
  moduleName: string;
  moduleAcronym: string;
}

export interface FinalMemoryStatusSummary {
  statusCode: string;
  statusName: string;
  total: number;
}

export interface FinalMemoryModel {
  title: string;
  generatedAt: Date;
  outputFormat: DocumentOutputFormat;
  context: FinalMemoryProgrammeLevelContext;
  academicYear: {
    id: number;
    name: string;
  };
  programme: {
    id: number;
    code: string;
    name: string;
    acronym: string;
  };
  level: {
    id: number;
    name: string;
    number: number;
  };
  centres: Array<{
    id: number;
    name: string;
    shortName: string;
  }>;
  evaluations: Array<{
    id: number;
    code: string;
    name: string;
    status: string;
    sequence: number;
  }>;
  summary: FinalMemorySummary;
  moduleSummaries: FinalMemoryModuleSummary[];
  statusSummary: FinalMemoryStatusSummary[];
  warnings: string[];
  methodologyNote: string;
}

interface HeaderRow {
  academic_year_id: bigint | number;
  academic_year_name: string;
  programme_id: bigint | number;
  programme_code: string;
  programme_name: string;
  programme_acronym: string;
  level_id: bigint | number;
  level_name: string;
  level_number: number;
}

interface CentreRow {
  centre_id: bigint | number;
  centre_name: string;
  centre_short_name: string | null;
}

interface EvaluationRow {
  evaluation_id: bigint | number;
  evaluation_code: string;
  evaluation_name: string;
  evaluation_status: string;
  evaluation_sequence: number;
}

interface ModuleRow {
  module_id: bigint | number;
  module_code: string;
  module_name: string;
  module_acronym: string | null;
}

interface EnrolmentGradeRow {
  enrolment_id: bigint | number;
  student_id: bigint | number;
  module_id: bigint | number;
  module_code: string;
  module_name: string;
  module_acronym: string | null;
  grade_id: bigint | number | null;
  numeric_grade: string | number | null;
  final_grade: string | number | null;
  is_passed: boolean | number | null;
  status_code: string | null;
  status_name: string | null;
  is_evaluable: boolean | number | null;
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

function roundPercentage(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateAverage(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce(
    (sum, value) => sum + value,
    0,
  );

  return Math.round((total / values.length) * 100) / 100;
}

function emptySummary(moduleCount = 0): FinalMemorySummary {
  return {
    modules: moduleCount,
    enrolledStudents: 0,
    moduleEnrolments: 0,
    evaluated: 0,
    passed: 0,
    failed: 0,
    notEvaluated: 0,
    successRate: 0,
    performanceRate: 0,
    averageGrade: null,
  };
}

function buildSummary(
  rows: EnrolmentGradeRow[],
  moduleCount: number,
): FinalMemorySummary {
  if (rows.length === 0) {
    return emptySummary(moduleCount);
  }

  const studentIds = new Set<number>();
  const numericGrades: number[] = [];
  let evaluated = 0;
  let passed = 0;
  let failed = 0;

  rows.forEach((row) => {
    studentIds.add(toNumber(row.student_id));

    const numericGrade = toOptionalNumber(row.final_grade) ?? toOptionalNumber(row.numeric_grade);
    const isEvaluable = toBoolean(row.is_evaluable) ?? numericGrade !== null;
    const isPassed = toBoolean(row.is_passed);

    if (numericGrade !== null) {
      numericGrades.push(numericGrade);
    }

    if (isEvaluable && numericGrade !== null) {
      evaluated += 1;
    }

    if (isPassed === true) {
      passed += 1;
    }

    if (isPassed === false && isEvaluable) {
      failed += 1;
    }
  });

  const moduleEnrolments = rows.length;
  const notEvaluated = Math.max(moduleEnrolments - evaluated, 0);

  return {
    modules: moduleCount,
    enrolledStudents: studentIds.size,
    moduleEnrolments,
    evaluated,
    passed,
    failed,
    notEvaluated,
    successRate: evaluated > 0 ? roundPercentage((passed / evaluated) * 100) : 0,
    performanceRate: moduleEnrolments > 0 ? roundPercentage((passed / moduleEnrolments) * 100) : 0,
    averageGrade: calculateAverage(numericGrades),
  };
}

function buildStatusSummary(rows: EnrolmentGradeRow[]): FinalMemoryStatusSummary[] {
  const counter = new Map<string, FinalMemoryStatusSummary>();

  rows.forEach((row) => {
    const hasNumericGrade = toOptionalNumber(row.final_grade) !== null
      || toOptionalNumber(row.numeric_grade) !== null;
    const statusCode = row.status_code ?? (hasNumericGrade ? 'NUMERICA' : 'SIN_CALIFICACION');
    const statusName = row.status_name ?? (hasNumericGrade ? 'Calificación numérica' : 'Sin calificación');
    const current = counter.get(statusCode);

    if (current) {
      current.total += 1;
      return;
    }

    counter.set(statusCode, {
      statusCode,
      statusName,
      total: 1,
    });
  });

  return [...counter.values()].sort((first, second) => second.total - first.total);
}

function buildWarnings(
  summary: FinalMemorySummary,
  moduleSummaries: FinalMemoryModuleSummary[],
): string[] {
  const warnings: string[] = [];

  if (summary.modules === 0) {
    warnings.push('No hay módulos activos asociados al ciclo y curso seleccionados.');
    return warnings;
  }

  if (summary.moduleEnrolments === 0) {
    warnings.push('No hay matrículas registradas para el ciclo, curso y año académico seleccionados.');
    return warnings;
  }

  const modulesWithoutGrades = moduleSummaries.filter((moduleSummary) => moduleSummary.evaluated === 0);

  if (modulesWithoutGrades.length > 0) {
    warnings.push(`Hay ${modulesWithoutGrades.length} módulo(s) sin calificaciones numéricas registradas.`);
  }

  const lowPerformanceModules = moduleSummaries.filter((moduleSummary) =>
    moduleSummary.moduleEnrolments > 0
    && moduleSummary.performanceRate < 50,
  );

  if (lowPerformanceModules.length > 0) {
    warnings.push(`Hay ${lowPerformanceModules.length} módulo(s) con tasa de rendimiento inferior al 50 %.`);
  }

  if (summary.notEvaluated > 0) {
    warnings.push('Existen matrículas sin calificación numérica en la última evaluación registrada.');
  }

  return warnings;
}

export async function buildFinalMemoryProgrammeLevel(
  context: FinalMemoryProgrammeLevelContext,
  outputFormat: DocumentOutputFormat,
  generatedAt: Date,
): Promise<FinalMemoryModel> {
  const headerRows = await prisma.$queryRaw<HeaderRow[]>`
    SELECT
      ay.id AS academic_year_id,
      ay.name AS academic_year_name,
      vp.id AS programme_id,
      vp.code AS programme_code,
      vp.name AS programme_name,
      vp.acronym AS programme_acronym,
      al.id AS level_id,
      al.name AS level_name,
      al.number AS level_number
    FROM academic_years ay
    INNER JOIN vocational_programmes vp ON vp.id = ${context.vocationalProgrammeId}
    INNER JOIN academic_levels al ON al.id = ${context.academicLevelId}
    WHERE ay.id = ${context.academicYearId}
      AND ay.deleted_at IS NULL
      AND vp.deleted_at IS NULL
      AND al.deleted_at IS NULL
    LIMIT 1
  `;

  const header = headerRows[0];

  if (!header) {
    throw new Error('No se ha encontrado el curso académico, ciclo o nivel seleccionado.');
  }

  const moduleRows = await prisma.$queryRaw<ModuleRow[]>`
    SELECT
      id AS module_id,
      code AS module_code,
      name AS module_name,
      acronym AS module_acronym
    FROM modules
    WHERE vocational_programme_id = ${context.vocationalProgrammeId}
      AND academic_level_id = ${context.academicLevelId}
      AND deleted_at IS NULL
      AND is_active = 1
    ORDER BY sort_order ASC, code ASC
  `;

  const enrolmentRows = await prisma.$queryRaw<EnrolmentGradeRow[]>`
    SELECT
      en.id AS enrolment_id,
      s.id AS student_id,
      m.id AS module_id,
      m.code AS module_code,
      m.name AS module_name,
      m.acronym AS module_acronym,
      g.id AS grade_id,
      g.numeric_grade,
      g.final_grade,
      g.is_passed,
      gs.code AS status_code,
      gs.name AS status_name,
      gs.is_evaluable
    FROM enrolments en
    INNER JOIN students s ON s.id = en.student_id
    INNER JOIN modules m ON m.id = en.module_id
    LEFT JOIN grades g
      ON g.id = (
        SELECT g2.id
        FROM grades g2
        INNER JOIN evaluations e2 ON e2.id = g2.evaluation_id
        WHERE g2.enrolment_id = en.id
          AND g2.deleted_at IS NULL
          AND e2.deleted_at IS NULL
          AND e2.academic_year_id = ${context.academicYearId}
        ORDER BY e2.sequence DESC, e2.id DESC
        LIMIT 1
      )
    LEFT JOIN grade_statuses gs
      ON gs.id = g.grade_status_id
      AND gs.deleted_at IS NULL
    WHERE en.academic_year_id = ${context.academicYearId}
      AND m.vocational_programme_id = ${context.vocationalProgrammeId}
      AND m.academic_level_id = ${context.academicLevelId}
      AND en.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND m.deleted_at IS NULL
    ORDER BY m.sort_order ASC, m.code ASC, s.last_name_1 ASC, s.last_name_2 ASC, s.first_name ASC
  `;

  const centres = await prisma.$queryRaw<CentreRow[]>`
    SELECT DISTINCT
      c.id AS centre_id,
      c.name AS centre_name,
      c.short_name AS centre_short_name
    FROM enrolments en
    INNER JOIN centres c ON c.id = en.centre_id
    INNER JOIN modules m ON m.id = en.module_id
    WHERE en.academic_year_id = ${context.academicYearId}
      AND m.vocational_programme_id = ${context.vocationalProgrammeId}
      AND m.academic_level_id = ${context.academicLevelId}
      AND en.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND m.deleted_at IS NULL
    ORDER BY c.name ASC
  `;

  const evaluations = await prisma.$queryRaw<EvaluationRow[]>`
    SELECT
      id AS evaluation_id,
      code AS evaluation_code,
      name AS evaluation_name,
      status AS evaluation_status,
      sequence AS evaluation_sequence
    FROM evaluations
    WHERE academic_year_id = ${context.academicYearId}
      AND deleted_at IS NULL
    ORDER BY sequence ASC, id ASC
  `;

  const moduleSummaries: FinalMemoryModuleSummary[] = moduleRows.map((moduleRow) => {
    const rows = enrolmentRows.filter((row) => toNumber(row.module_id) === toNumber(moduleRow.module_id));
    const summary = buildSummary(rows, 1);

    return {
      ...summary,
      moduleId: toNumber(moduleRow.module_id),
      moduleCode: moduleRow.module_code,
      moduleName: moduleRow.module_name,
      moduleAcronym: moduleRow.module_acronym ?? '',
    };
  });

  const summary = buildSummary(
    enrolmentRows,
    moduleRows.length,
  );
  const statusSummary = buildStatusSummary(enrolmentRows);

  return {
    title: 'Memoria final de ciclo y curso',
    generatedAt,
    outputFormat,
    context,
    academicYear: {
      id: toNumber(header.academic_year_id),
      name: header.academic_year_name,
    },
    programme: {
      id: toNumber(header.programme_id),
      code: header.programme_code,
      name: header.programme_name,
      acronym: header.programme_acronym,
    },
    level: {
      id: toNumber(header.level_id),
      name: header.level_name,
      number: header.level_number,
    },
    centres: centres.map((centre) => ({
      id: toNumber(centre.centre_id),
      name: centre.centre_name,
      shortName: centre.centre_short_name ?? '',
    })),
    evaluations: evaluations.map((evaluation) => ({
      id: toNumber(evaluation.evaluation_id),
      code: evaluation.evaluation_code,
      name: evaluation.evaluation_name,
      status: evaluation.evaluation_status,
      sequence: evaluation.evaluation_sequence,
    })),
    summary,
    moduleSummaries,
    statusSummary,
    warnings: buildWarnings(
      summary,
      moduleSummaries,
    ),
    methodologyNote:
      'La memoria usa la última calificación registrada por matrícula dentro del curso académico seleccionado, ordenada por la secuencia de evaluación.',
  };
}
