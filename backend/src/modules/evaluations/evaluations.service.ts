import type {
  EvaluationStatus,
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  CreateEvaluationInput,
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

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function toDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T00:00:00.000Z`);
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
