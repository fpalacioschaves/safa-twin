import type {
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  CreateGradeStatusInput,
  ListGradeStatusesQuery,
  UpdateGradeStatusInput,
} from './grade-statuses.schemas.js';

export class GradeStatusAlreadyExistsError extends Error {
  constructor() {
    super(
      'Ya existe un estado de calificación con ese código.',
    );
  }
}

export class GradeStatusNotFoundError extends Error {
  constructor() {
    super('El estado de calificación no existe.');
  }
}

export class GradeStatusArchivedError extends Error {
  constructor() {
    super('El estado de calificación está archivado.');
  }
}

export class GradeStatusAlreadyArchivedError extends Error {
  constructor() {
    super('El estado de calificación ya está archivado.');
  }
}

export class GradeStatusNotArchivedError extends Error {
  constructor() {
    super('El estado de calificación no está archivado.');
  }
}

const gradeStatusSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  isEvaluable: true,
  countsAsPassed: true,
  countsAsNoShow: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.GradeStatusSelect;

export type GradeStatusListItem =
  Prisma.GradeStatusGetPayload<{
    select: typeof gradeStatusSelect;
  }>;

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

async function assertCodeIsAvailable(
  code: string,
  currentGradeStatusId?: number,
): Promise<void> {
  const existingGradeStatus =
    await prisma.gradeStatus.findFirst({
      where: {
        code: normalizeCode(code),
        deletedAt: null,
        ...(currentGradeStatusId
          ? {
              id: {
                not: currentGradeStatusId,
              },
            }
          : {}),
      },
      select: { id: true },
    });

  if (existingGradeStatus) {
    throw new GradeStatusAlreadyExistsError();
  }
}

function buildWhere(
  query: ListGradeStatusesQuery,
): Prisma.GradeStatusWhereInput {
  const where: Prisma.GradeStatusWhereInput = {};

  if (query.status === 'archived') {
    where.deletedAt = { not: null };
  } else {
    where.deletedAt = null;
  }

  if (query.status === 'active') {
    where.isActive = true;
  }

  if (query.status === 'inactive') {
    where.isActive = false;
  }

  if (query.search) {
    where.OR = [
      { code: { contains: query.search } },
      { name: { contains: query.search } },
    ];
  }

  return where;
}

export async function listGradeStatuses(
  query: ListGradeStatusesQuery,
) {
  const where = buildWhere(query);

  const [total, gradeStatuses] =
    await prisma.$transaction([
      prisma.gradeStatus.count({ where }),
      prisma.gradeStatus.findMany({
        where,
        select: gradeStatusSelect,
        orderBy: [
          { sortOrder: 'asc' },
          { code: 'asc' },
        ],
        skip:
          (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

  return {
    items: gradeStatuses,
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

export async function getGradeStatusById(
  gradeStatusId: number,
): Promise<GradeStatusListItem> {
  const gradeStatus =
    await prisma.gradeStatus.findUnique({
      where: { id: gradeStatusId },
      select: gradeStatusSelect,
    });

  if (!gradeStatus) {
    throw new GradeStatusNotFoundError();
  }

  return gradeStatus;
}

export async function createGradeStatus(
  input: CreateGradeStatusInput,
): Promise<GradeStatusListItem> {
  await assertCodeIsAvailable(input.code);

  return prisma.gradeStatus.create({
    data: {
      code: normalizeCode(input.code),
      name: input.name.trim(),
      description: input.description,
      isEvaluable: input.isEvaluable,
      countsAsPassed: input.countsAsPassed,
      countsAsNoShow: input.countsAsNoShow,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
    select: gradeStatusSelect,
  });
}

export async function updateGradeStatus(
  gradeStatusId: number,
  input: UpdateGradeStatusInput,
): Promise<GradeStatusListItem> {
  const currentGradeStatus =
    await prisma.gradeStatus.findUnique({
      where: { id: gradeStatusId },
      select: { id: true, deletedAt: true },
    });

  if (!currentGradeStatus) {
    throw new GradeStatusNotFoundError();
  }

  if (currentGradeStatus.deletedAt) {
    throw new GradeStatusArchivedError();
  }

  await assertCodeIsAvailable(
    input.code,
    gradeStatusId,
  );

  return prisma.gradeStatus.update({
    where: { id: gradeStatusId },
    data: {
      code: normalizeCode(input.code),
      name: input.name.trim(),
      description: input.description,
      isEvaluable: input.isEvaluable,
      countsAsPassed: input.countsAsPassed,
      countsAsNoShow: input.countsAsNoShow,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
    select: gradeStatusSelect,
  });
}

export async function archiveGradeStatus(
  gradeStatusId: number,
): Promise<GradeStatusListItem> {
  const gradeStatus =
    await prisma.gradeStatus.findUnique({
      where: { id: gradeStatusId },
      select: { id: true, deletedAt: true },
    });

  if (!gradeStatus) {
    throw new GradeStatusNotFoundError();
  }

  if (gradeStatus.deletedAt) {
    throw new GradeStatusAlreadyArchivedError();
  }

  return prisma.gradeStatus.update({
    where: { id: gradeStatusId },
    data: { deletedAt: new Date() },
    select: gradeStatusSelect,
  });
}

export async function restoreGradeStatus(
  gradeStatusId: number,
): Promise<GradeStatusListItem> {
  const gradeStatus =
    await prisma.gradeStatus.findUnique({
      where: { id: gradeStatusId },
      select: { id: true, deletedAt: true },
    });

  if (!gradeStatus) {
    throw new GradeStatusNotFoundError();
  }

  if (!gradeStatus.deletedAt) {
    throw new GradeStatusNotArchivedError();
  }

  return prisma.gradeStatus.update({
    where: { id: gradeStatusId },
    data: { deletedAt: null },
    select: gradeStatusSelect,
  });
}
