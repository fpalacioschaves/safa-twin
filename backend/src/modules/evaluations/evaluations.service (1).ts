import type {
  EvaluationStatus,
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  CreateEvaluationInput,
  EvaluationStatisticsQuery,
  ListEvaluationsQuery,
  UpdateEvaluationInput,
} from './evaluations.schemas.js';

export class EvaluationAlreadyExistsError extends Error {
  constructor() {
    super(
      'Ya existe una evaluación con ese código para el curso académico y centro seleccionados.',
    );
  }
}

export class EvaluationNotFoundError extends Error {
  constructor() {
    super('La evaluación no existe.');
  }
}

export class EvaluationArchivedError extends Error {
  constructor() {
    super('La evaluación está archivada.');
  }
}

export class EvaluationAlreadyArchivedError extends Error {
  constructor() {
    super('La evaluación ya está archivada.');
  }
}

export class EvaluationNotArchivedError extends Error {
  constructor() {
    super('La evaluación no está archivada.');
  }
}

export class EvaluationRelatedEntityUnavailableError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class EvaluationStatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const evaluationSelect = {
  id: true,
  academicYearId: true,
  centreId: true,
  code: true,
  name: true,
  sequence: true,
  startsAt: true,
  endsAt: true,
  status: true,
  closedAt: true,
  remarks: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  academicYear: {
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  },
  centre: {
    select: {
      id: true,
      code: true,
      name: true,
      shortName: true,
      taxId: true,
      address: true,
      postalCode: true,
      city: true,
      province: true,
      phone: true,
      email: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  },
} satisfies Prisma.EvaluationSelect;

export type EvaluationListItem =
  Prisma.EvaluationGetPayload<{
    select: typeof evaluationSelect;
  }>;

type StatisticsAccumulator = {
  enrolled: number;
  numericEvaluated: number;
  passed: number;
  failed: number;
  withoutGradeRecord: number;
  withoutNumericStatus: number;
  nonNumericStatuses: Map<
    string,
    {
      code: string;
      name: string;
      isEvaluable: boolean;
      countsAsPassed: boolean;
      countsAsNoShow: boolean;
      total: number;
    }
  >;
};

function createStatisticsAccumulator():
StatisticsAccumulator {
  return {
    enrolled: 0,
    numericEvaluated: 0,
    passed: 0,
    failed: 0,
    withoutGradeRecord: 0,
    withoutNumericStatus: 0,
    nonNumericStatuses: new Map(),
  };
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function toDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

function decimalToNumber(
  value: Prisma.Decimal | number | null,
): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function roundPercentage(value: number): number {
  return Math.round(value * 10000) / 100;
}

function serializeNonNumericStatuses(
  accumulator: StatisticsAccumulator,
) {
  return Array.from(
    accumulator.nonNumericStatuses.values(),
  ).sort((left, right) =>
    left.code.localeCompare(right.code),
  );
}

function buildStatisticsSummary(
  accumulator: StatisticsAccumulator,
) {
  const notNumericallyEvaluated =
    accumulator.enrolled
    - accumulator.numericEvaluated;

  return {
    totals: {
      enrolled: accumulator.enrolled,
      numericEvaluated:
        accumulator.numericEvaluated,
      passed: accumulator.passed,
      failed: accumulator.failed,
      notNumericallyEvaluated,
      withoutGradeRecord:
        accumulator.withoutGradeRecord,
      withoutNumericStatus:
        accumulator.withoutNumericStatus,
    },
    rates: {
      successRate:
        accumulator.numericEvaluated > 0
          ? roundPercentage(
            accumulator.passed
            / accumulator.numericEvaluated,
          )
          : null,
      performanceRate:
        accumulator.enrolled > 0
          ? roundPercentage(
            accumulator.passed
            / accumulator.enrolled,
          )
          : null,
    },
    nonNumericStatuses:
      serializeNonNumericStatuses(accumulator),
  };
}

function addNonNumericStatus(
  accumulator: StatisticsAccumulator,
  gradeStatus: {
    code: string;
    name: string;
    isEvaluable: boolean;
    countsAsPassed: boolean;
    countsAsNoShow: boolean;
  },
): void {
  const normalizedStatusCode =
    normalizeCode(gradeStatus.code);

  const existingStatus =
    accumulator.nonNumericStatuses.get(
      normalizedStatusCode,
    );

  if (existingStatus) {
    existingStatus.total += 1;
    return;
  }

  accumulator.nonNumericStatuses.set(
    normalizedStatusCode,
    {
      code: normalizedStatusCode,
      name: gradeStatus.name,
      isEvaluable: gradeStatus.isEvaluable,
      countsAsPassed:
        gradeStatus.countsAsPassed,
      countsAsNoShow:
        gradeStatus.countsAsNoShow,
      total: 1,
    },
  );
}

function addGradeToStatistics(
  accumulator: StatisticsAccumulator,
  grade: {
    finalGrade: Prisma.Decimal | null;
    numericGrade: Prisma.Decimal | null;
    gradeStatus: {
      code: string;
      name: string;
      isEvaluable: boolean;
      countsAsPassed: boolean;
      countsAsNoShow: boolean;
    } | null;
  } | null,
): void {
  accumulator.enrolled += 1;

  if (!grade) {
    accumulator.withoutGradeRecord += 1;
    return;
  }

  const numericGrade =
    decimalToNumber(grade.finalGrade)
    ?? decimalToNumber(grade.numericGrade);

  if (numericGrade !== null) {
    accumulator.numericEvaluated += 1;

    if (numericGrade >= 5) {
      accumulator.passed += 1;
    } else {
      accumulator.failed += 1;
    }

    return;
  }

  if (grade.gradeStatus) {
    addNonNumericStatus(
      accumulator,
      grade.gradeStatus,
    );
    return;
  }

  accumulator.withoutNumericStatus += 1;
}

async function assertRelatedEntitiesAvailable(
  input: {
    academicYearId: number;
    centreId: number;
  },
): Promise<void> {
  const [academicYear, centre] =
    await Promise.all([
      prisma.academicYear.findFirst({
        where: {
          id: input.academicYearId,
          deletedAt: null,
          isActive: true,
        },
        select: { id: true },
      }),
      prisma.centre.findFirst({
        where: {
          id: input.centreId,
          deletedAt: null,
          isActive: true,
        },
        select: { id: true },
      }),
    ]);

  if (!academicYear) {
    throw new EvaluationRelatedEntityUnavailableError(
      'El curso académico seleccionado no existe o no está activo.',
    );
  }

  if (!centre) {
    throw new EvaluationRelatedEntityUnavailableError(
      'El centro seleccionado no existe o no está activo.',
    );
  }
}

async function assertEvaluationCodeIsAvailable(
  input: {
    academicYearId: number;
    centreId: number;
    code: string;
  },
  currentEvaluationId?: number,
): Promise<void> {
  const existingEvaluation =
    await prisma.evaluation.findFirst({
      where: {
        academicYearId: input.academicYearId,
        centreId: input.centreId,
        code: normalizeCode(input.code),
        deletedAt: null,
        ...(currentEvaluationId
          ? {
              id: {
                not: currentEvaluationId,
              },
            }
          : {}),
      },
      select: { id: true },
    });

  if (existingEvaluation) {
    throw new EvaluationAlreadyExistsError();
  }
}

function buildWhere(
  query: ListEvaluationsQuery,
): Prisma.EvaluationWhereInput {
  const where: Prisma.EvaluationWhereInput = {};

  if (query.status === 'archived') {
    where.deletedAt = { not: null };
  } else {
    where.deletedAt = null;
  }

  if (
    query.status !== 'all'
    && query.status !== 'archived'
  ) {
    where.status = query.status as EvaluationStatus;
  }

  if (query.academicYearId) {
    where.academicYearId = query.academicYearId;
  }

  if (query.centreId) {
    where.centreId = query.centreId;
  }

  if (query.search) {
    where.OR = [
      {
        code: {
          contains: query.search,
        },
      },
      {
        name: {
          contains: query.search,
        },
      },
    ];
  }

  return where;
}

async function getEditableEvaluationOrThrow(
  evaluationId: number,
) {
  const evaluation =
    await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: {
        id: true,
        status: true,
        deletedAt: true,
      },
    });

  if (!evaluation) {
    throw new EvaluationNotFoundError();
  }

  if (evaluation.deletedAt) {
    throw new EvaluationArchivedError();
  }

  return evaluation;
}

export async function listEvaluations(
  query: ListEvaluationsQuery,
) {
  const where = buildWhere(query);

  const [total, evaluations] =
    await prisma.$transaction([
      prisma.evaluation.count({ where }),
      prisma.evaluation.findMany({
        where,
        select: evaluationSelect,
        orderBy: [
          { sequence: 'asc' },
          { startsAt: 'asc' },
          { name: 'asc' },
        ],
        skip:
          (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

  return {
    items: evaluations,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(
        1,
        Math.ceil(total / query.pageSize),
      ),
    },
  };
}

export async function getEvaluationById(
  evaluationId: number,
): Promise<EvaluationListItem> {
  const evaluation =
    await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: evaluationSelect,
    });

  if (!evaluation) {
    throw new EvaluationNotFoundError();
  }

  return evaluation;
}

export async function createEvaluation(
  input: CreateEvaluationInput,
): Promise<EvaluationListItem> {
  await assertRelatedEntitiesAvailable(input);
  await assertEvaluationCodeIsAvailable(input);

  const evaluation =
    await prisma.evaluation.create({
      data: {
        academicYearId: input.academicYearId,
        centreId: input.centreId,
        code: normalizeCode(input.code),
        name: input.name.trim(),
        sequence: input.sequence,
        startsAt: toDate(input.startsAt),
        endsAt: toDate(input.endsAt),
        status: input.status,
        closedAt:
          input.status === 'CLOSED'
          || input.status === 'LOCKED'
            ? new Date()
            : null,
        remarks: input.remarks,
      },
      select: evaluationSelect,
    });

  return evaluation;
}

export async function updateEvaluation(
  evaluationId: number,
  input: UpdateEvaluationInput,
): Promise<EvaluationListItem> {
  const currentEvaluation =
    await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: { id: true, deletedAt: true },
    });

  if (!currentEvaluation) {
    throw new EvaluationNotFoundError();
  }

  if (currentEvaluation.deletedAt) {
    throw new EvaluationArchivedError();
  }

  await assertRelatedEntitiesAvailable(input);
  await assertEvaluationCodeIsAvailable(
    input,
    evaluationId,
  );

  return prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      academicYearId: input.academicYearId,
      centreId: input.centreId,
      code: normalizeCode(input.code),
      name: input.name.trim(),
      sequence: input.sequence,
      startsAt: toDate(input.startsAt),
      endsAt: toDate(input.endsAt),
      status: input.status,
      closedAt:
        input.status === 'CLOSED'
        || input.status === 'LOCKED'
          ? new Date()
          : null,
      remarks: input.remarks,
    },
    select: evaluationSelect,
  });
}

export async function closeEvaluation(
  evaluationId: number,
): Promise<EvaluationListItem> {
  const evaluation =
    await getEditableEvaluationOrThrow(evaluationId);

  if (evaluation.status === 'CLOSED') {
    throw new EvaluationStatusTransitionError(
      'La evaluación ya está cerrada.',
    );
  }

  if (evaluation.status === 'LOCKED') {
    throw new EvaluationStatusTransitionError(
      'La evaluación está bloqueada. Para cambiarla, primero debe reabrirse con permisos suficientes.',
    );
  }

  return prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
    },
    select: evaluationSelect,
  });
}

export async function lockEvaluation(
  evaluationId: number,
): Promise<EvaluationListItem> {
  const evaluation =
    await getEditableEvaluationOrThrow(evaluationId);

  if (evaluation.status === 'LOCKED') {
    throw new EvaluationStatusTransitionError(
      'La evaluación ya está bloqueada.',
    );
  }

  return prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      status: 'LOCKED',
      closedAt: new Date(),
    },
    select: evaluationSelect,
  });
}

export async function reopenEvaluation(
  evaluationId: number,
): Promise<EvaluationListItem> {
  const evaluation =
    await getEditableEvaluationOrThrow(evaluationId);

  if (
    evaluation.status !== 'CLOSED'
    && evaluation.status !== 'LOCKED'
  ) {
    throw new EvaluationStatusTransitionError(
      'Solo se pueden reabrir evaluaciones cerradas o bloqueadas.',
    );
  }

  return prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      status: 'OPEN',
      closedAt: null,
    },
    select: evaluationSelect,
  });
}

export async function archiveEvaluation(
  evaluationId: number,
): Promise<EvaluationListItem> {
  const evaluation =
    await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: { id: true, deletedAt: true },
    });

  if (!evaluation) {
    throw new EvaluationNotFoundError();
  }

  if (evaluation.deletedAt) {
    throw new EvaluationAlreadyArchivedError();
  }

  return prisma.evaluation.update({
    where: { id: evaluationId },
    data: { deletedAt: new Date() },
    select: evaluationSelect,
  });
}

export async function restoreEvaluation(
  evaluationId: number,
): Promise<EvaluationListItem> {
  const evaluation =
    await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: { id: true, deletedAt: true },
    });

  if (!evaluation) {
    throw new EvaluationNotFoundError();
  }

  if (!evaluation.deletedAt) {
    throw new EvaluationNotArchivedError();
  }

  return prisma.evaluation.update({
    where: { id: evaluationId },
    data: { deletedAt: null },
    select: evaluationSelect,
  });
}

export async function getEvaluationStatistics(
  evaluationId: number,
  query: EvaluationStatisticsQuery,
) {
  const evaluation =
    await prisma.evaluation.findUnique({
      where: {
        id: evaluationId,
      },
      select: evaluationSelect,
    });

  if (!evaluation) {
    throw new EvaluationNotFoundError();
  }

  if (evaluation.deletedAt) {
    throw new EvaluationArchivedError();
  }

  const enrolmentWhere:
  Prisma.EnrolmentWhereInput = {
    academicYearId: evaluation.academicYearId,
    centreId: evaluation.centreId,
    deletedAt: null,
  };

  if (query.moduleId) {
    enrolmentWhere.moduleId = query.moduleId;
  }

  const moduleWhere: Prisma.ModuleWhereInput = {};

  if (query.vocationalProgrammeId) {
    moduleWhere.vocationalProgrammeId =
      query.vocationalProgrammeId;
  }

  if (query.academicLevelId) {
    moduleWhere.academicLevelId =
      query.academicLevelId;
  }

  if (
    Object.keys(moduleWhere).length > 0
  ) {
    enrolmentWhere.module = {
      is: moduleWhere,
    };
  }

  const enrolments =
    await prisma.enrolment.findMany({
      where: enrolmentWhere,
      select: {
        id: true,
        moduleId: true,
        module: {
          select: {
            id: true,
            code: true,
            name: true,
            acronym: true,
            vocationalProgrammeId: true,
            academicLevelId: true,
            vocationalProgramme: {
              select: {
                id: true,
                code: true,
                name: true,
                acronym: true,
              },
            },
            academicLevel: {
              select: {
                id: true,
                number: true,
                name: true,
              },
            },
          },
        },
        grades: {
          where: {
            evaluationId,
            deletedAt: null,
          },
          select: {
            id: true,
            numericGrade: true,
            finalGrade: true,
            gradeStatus: {
              select: {
                code: true,
                name: true,
                isEvaluable: true,
                countsAsPassed: true,
                countsAsNoShow: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          module: {
            sortOrder: 'asc',
          },
        },
        {
          module: {
            name: 'asc',
          },
        },
        {
          id: 'asc',
        },
      ],
    });

  const globalStatistics =
    createStatisticsAccumulator();

  const moduleStatistics =
    new Map<
      number,
      {
        module: {
          id: number;
          code: string;
          name: string;
          acronym: string | null;
          vocationalProgrammeId: number;
          academicLevelId: number;
          vocationalProgramme: {
            id: number;
            code: string;
            name: string;
            acronym: string;
          };
          academicLevel: {
            id: number;
            number: number;
            name: string;
          };
        };
        accumulator: StatisticsAccumulator;
      }
    >();

  for (const enrolment of enrolments) {
    const grade =
      enrolment.grades[0] ?? null;

    addGradeToStatistics(
      globalStatistics,
      grade,
    );

    const existingModuleStatistics =
      moduleStatistics.get(enrolment.moduleId);

    if (existingModuleStatistics) {
      addGradeToStatistics(
        existingModuleStatistics.accumulator,
        grade,
      );
    } else {
      const accumulator =
        createStatisticsAccumulator();

      addGradeToStatistics(
        accumulator,
        grade,
      );

      moduleStatistics.set(
        enrolment.moduleId,
        {
          module: enrolment.module,
          accumulator,
        },
      );
    }
  }

  return {
    evaluation,
    filters: {
      moduleId: query.moduleId ?? null,
      vocationalProgrammeId:
        query.vocationalProgrammeId ?? null,
      academicLevelId:
        query.academicLevelId ?? null,
    },
    summary:
      buildStatisticsSummary(
        globalStatistics,
      ),
    modules:
      Array.from(moduleStatistics.values())
        .map((item) => ({
          module: item.module,
          statistics:
            buildStatisticsSummary(
              item.accumulator,
            ),
        })),
    formulas: {
      successRate:
        'Tasa de éxito = aprobados con nota numérica / matrículas modulares evaluadas numéricamente.',
      performanceRate:
        'Tasa de rendimiento = aprobados con nota numérica / matrículas modulares incluidas en la evaluación.',
      nonNumericStatuses:
        'Los estados no numéricos se muestran aparte y no se convierten en nota.',
    },
  };
}
