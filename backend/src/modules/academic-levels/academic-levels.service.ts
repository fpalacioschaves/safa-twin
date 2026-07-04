import type {
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  CreateAcademicLevelInput,
  ListAcademicLevelsQuery,
  UpdateAcademicLevelInput,
} from './academic-levels.schemas.js';

const academicLevelSelect = {
  id: true,
  number: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,

  _count: {
    select: {
      academicOfferings: true,
      modules: true,
    },
  },
} satisfies Prisma.AcademicLevelSelect;

type AcademicLevelRecord =
  Prisma.AcademicLevelGetPayload<{
    select: typeof academicLevelSelect;
  }>;

export class AcademicLevelNumberAlreadyExistsError
  extends Error {
  public constructor() {
    super(
      'Ya existe un nivel académico con ese número.',
    );

    this.name =
      'AcademicLevelNumberAlreadyExistsError';
  }
}

export class AcademicLevelNameAlreadyExistsError
  extends Error {
  public constructor() {
    super(
      'Ya existe un nivel académico con ese nombre.',
    );

    this.name =
      'AcademicLevelNameAlreadyExistsError';
  }
}

export class AcademicLevelIdentifierConflictError
  extends Error {
  public constructor() {
    super(
      'Ya existe un nivel con el número o el nombre indicado.',
    );

    this.name =
      'AcademicLevelIdentifierConflictError';
  }
}

export class AcademicLevelNotFoundError
  extends Error {
  public constructor() {
    super(
      'El nivel académico solicitado no existe.',
    );

    this.name =
      'AcademicLevelNotFoundError';
  }
}

export class AcademicLevelArchivedError
  extends Error {
  public constructor() {
    super(
      'El nivel académico está archivado y no puede modificarse.',
    );

    this.name =
      'AcademicLevelArchivedError';
  }
}

export class AcademicLevelAlreadyArchivedError
  extends Error {
  public constructor() {
    super(
      'El nivel académico ya está archivado.',
    );

    this.name =
      'AcademicLevelAlreadyArchivedError';
  }
}

export class AcademicLevelNotArchivedError
  extends Error {
  public constructor() {
    super(
      'El nivel académico no está archivado.',
    );

    this.name =
      'AcademicLevelNotArchivedError';
  }
}

export class AcademicLevelHasActiveModulesError
  extends Error {
  public readonly activeModuleCount: number;

  public constructor(
    activeModuleCount: number,
  ) {
    super(
      'El nivel académico tiene módulos activos y no puede desactivarse ni archivarse.',
    );

    this.name =
      'AcademicLevelHasActiveModulesError';

    this.activeModuleCount =
      activeModuleCount;
  }
}

export class AcademicLevelHasActiveOfferingsError
  extends Error {
  public readonly activeOfferingCount: number;

  public constructor(
    activeOfferingCount: number,
  ) {
    super(
      'El nivel académico tiene ofertas académicas activas y no puede desactivarse ni archivarse.',
    );

    this.name =
      'AcademicLevelHasActiveOfferingsError';

    this.activeOfferingCount =
      activeOfferingCount;
  }
}

function isPrismaUniqueConstraintError(
  error: unknown,
): boolean {
  if (
    typeof error !== 'object'
    || error === null
    || !('code' in error)
  ) {
    return false;
  }

  return error.code === 'P2002';
}

function normalizeOptionalText(
  value: string | undefined,
): string | null {
  const normalizedValue =
    value?.trim();

  return normalizedValue || null;
}

function mapAcademicLevel(
  academicLevel: AcademicLevelRecord,
) {
  return {
    id: academicLevel.id,
    number: academicLevel.number,
    name: academicLevel.name,
    description: academicLevel.description,
    isActive: academicLevel.isActive,
    createdAt: academicLevel.createdAt,
    updatedAt: academicLevel.updatedAt,
    deletedAt: academicLevel.deletedAt,

    summary: {
      totalOfferingCount:
        academicLevel._count.academicOfferings,

      totalModuleCount:
        academicLevel._count.modules,
    },
  };
}

async function ensureIdentifiersAreAvailable(
  number: number,
  name: string,
  excludedAcademicLevelId?: number,
): Promise<void> {
  const exclusionFilter =
    excludedAcademicLevelId === undefined
      ? {}
      : {
          id: {
            not: excludedAcademicLevelId,
          },
        };

  const [
    levelWithSameNumber,
    levelWithSameName,
  ] = await prisma.$transaction([
    prisma.academicLevel.findFirst({
      where: {
        ...exclusionFilter,
        number,
      },

      select: {
        id: true,
      },
    }),

    prisma.academicLevel.findFirst({
      where: {
        ...exclusionFilter,
        name,
      },

      select: {
        id: true,
      },
    }),
  ]);

  if (levelWithSameNumber) {
    throw new AcademicLevelNumberAlreadyExistsError();
  }

  if (levelWithSameName) {
    throw new AcademicLevelNameAlreadyExistsError();
  }
}

async function ensureAcademicLevelHasNoActiveRelations(
  academicLevelId: number,
): Promise<void> {
  const [
    activeModuleCount,
    activeOfferingCount,
  ] = await prisma.$transaction([
    prisma.module.count({
      where: {
        academicLevelId,
        isActive: true,
        deletedAt: null,
      },
    }),

    prisma.academicOffering.count({
      where: {
        academicLevelId,
        isActive: true,
        deletedAt: null,
      },
    }),
  ]);

  if (activeModuleCount > 0) {
    throw new AcademicLevelHasActiveModulesError(
      activeModuleCount,
    );
  }

  if (activeOfferingCount > 0) {
    throw new AcademicLevelHasActiveOfferingsError(
      activeOfferingCount,
    );
  }
}

export async function listAcademicLevels(
  query: ListAcademicLevelsQuery,
) {
  const {
    page,
    pageSize,
    search,
    status,
    number,
  } = query;

  const where:
    Prisma.AcademicLevelWhereInput = {};

  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
        },
      },
      {
        description: {
          contains: search,
        },
      },
    ];
  }

  if (number !== undefined) {
    where.number = number;
  }

  if (status === 'active') {
    where.isActive = true;
    where.deletedAt = null;
  }

  if (status === 'inactive') {
    where.isActive = false;
    where.deletedAt = null;
  }

  if (status === 'archived') {
    where.deletedAt = {
      not: null,
    };
  }

  const skip = (page - 1) * pageSize;

  const [
    total,
    academicLevels,
  ] = await prisma.$transaction([
    prisma.academicLevel.count({
      where,
    }),

    prisma.academicLevel.findMany({
      where,
      skip,
      take: pageSize,

      orderBy: [
        {
          number: 'asc',
        },
        {
          name: 'asc',
        },
        {
          id: 'asc',
        },
      ],

      select: academicLevelSelect,
    }),
  ]);

  return {
    items: academicLevels.map(
      mapAcademicLevel,
    ),

    pagination: {
      page,
      pageSize,
      total,

      totalPages: Math.ceil(
        total / pageSize,
      ),
    },
  };
}

export async function getAcademicLevelById(
  academicLevelId: number,
) {
  const academicLevel =
    await prisma.academicLevel.findUnique({
      where: {
        id: academicLevelId,
      },

      select: academicLevelSelect,
    });

  if (!academicLevel) {
    throw new AcademicLevelNotFoundError();
  }

  return mapAcademicLevel(
    academicLevel,
  );
}

export async function createAcademicLevel(
  input: CreateAcademicLevelInput,
) {
  const normalizedName =
    input.name.trim();

  await ensureIdentifiersAreAvailable(
    input.number,
    normalizedName,
  );

  try {
    const academicLevel =
      await prisma.academicLevel.create({
        data: {
          number: input.number,
          name: normalizedName,

          description:
            normalizeOptionalText(
              input.description,
            ),

          isActive: input.isActive,
        },

        select: academicLevelSelect,
      });

    return mapAcademicLevel(
      academicLevel,
    );
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new AcademicLevelIdentifierConflictError();
    }

    throw error;
  }
}

export async function updateAcademicLevel(
  academicLevelId: number,
  input: UpdateAcademicLevelInput,
) {
  const existingAcademicLevel =
    await prisma.academicLevel.findUnique({
      where: {
        id: academicLevelId,
      },

      select: {
        id: true,
        isActive: true,
        deletedAt: true,
      },
    });

  if (!existingAcademicLevel) {
    throw new AcademicLevelNotFoundError();
  }

  if (
    existingAcademicLevel.deletedAt
    !== null
  ) {
    throw new AcademicLevelArchivedError();
  }

  if (
    existingAcademicLevel.isActive
    && !input.isActive
  ) {
    await ensureAcademicLevelHasNoActiveRelations(
      academicLevelId,
    );
  }

  const normalizedName =
    input.name.trim();

  await ensureIdentifiersAreAvailable(
    input.number,
    normalizedName,
    academicLevelId,
  );

  try {
    const academicLevel =
      await prisma.academicLevel.update({
        where: {
          id: academicLevelId,
        },

        data: {
          number: input.number,
          name: normalizedName,

          description:
            normalizeOptionalText(
              input.description,
            ),

          isActive: input.isActive,
        },

        select: academicLevelSelect,
      });

    return mapAcademicLevel(
      academicLevel,
    );
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new AcademicLevelIdentifierConflictError();
    }

    throw error;
  }
}

export async function archiveAcademicLevel(
  academicLevelId: number,
) {
  const existingAcademicLevel =
    await prisma.academicLevel.findUnique({
      where: {
        id: academicLevelId,
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingAcademicLevel) {
    throw new AcademicLevelNotFoundError();
  }

  if (
    existingAcademicLevel.deletedAt
    !== null
  ) {
    throw new AcademicLevelAlreadyArchivedError();
  }

  await ensureAcademicLevelHasNoActiveRelations(
    academicLevelId,
  );

  const academicLevel =
    await prisma.academicLevel.update({
      where: {
        id: academicLevelId,
      },

      data: {
        isActive: false,
        deletedAt: new Date(),
      },

      select: academicLevelSelect,
    });

  return mapAcademicLevel(
    academicLevel,
  );
}

export async function restoreAcademicLevel(
  academicLevelId: number,
) {
  const existingAcademicLevel =
    await prisma.academicLevel.findUnique({
      where: {
        id: academicLevelId,
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingAcademicLevel) {
    throw new AcademicLevelNotFoundError();
  }

  if (
    existingAcademicLevel.deletedAt
    === null
  ) {
    throw new AcademicLevelNotArchivedError();
  }

  const academicLevel =
    await prisma.academicLevel.update({
      where: {
        id: academicLevelId,
      },

      data: {
        isActive: true,
        deletedAt: null,
      },

      select: academicLevelSelect,
    });

  return mapAcademicLevel(
    academicLevel,
  );
}