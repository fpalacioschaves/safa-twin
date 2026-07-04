import type {
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  CreateAcademicYearInput,
  ListAcademicYearsQuery,
  UpdateAcademicYearInput,
} from './academic-years.schemas.js';

const academicYearSelect = {
  id: true,
  name: true,
  startDate: true,
  endDate: true,
  isCurrent: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.AcademicYearSelect;

type AcademicYearRecord =
  Prisma.AcademicYearGetPayload<{
    select: typeof academicYearSelect;
  }>;

export class AcademicYearNameAlreadyExistsError
  extends Error {
  public constructor() {
    super(
      'Ya existe un curso académico con ese nombre.',
    );

    this.name =
      'AcademicYearNameAlreadyExistsError';
  }
}

export class AcademicYearDateRangeOverlapError
  extends Error {
  public readonly conflictingAcademicYearName:
    string;

  public constructor(
    conflictingAcademicYearName: string,
  ) {
    super(
      `El periodo indicado se solapa con el curso académico ${conflictingAcademicYearName}.`,
    );

    this.name =
      'AcademicYearDateRangeOverlapError';

    this.conflictingAcademicYearName =
      conflictingAcademicYearName;
  }
}

export class AcademicYearNotFoundError
  extends Error {
  public constructor() {
    super(
      'El curso académico solicitado no existe.',
    );

    this.name =
      'AcademicYearNotFoundError';
  }
}

export class AcademicYearArchivedError
  extends Error {
  public constructor() {
    super(
      'El curso académico está archivado y no puede modificarse.',
    );

    this.name =
      'AcademicYearArchivedError';
  }
}

export class AcademicYearAlreadyArchivedError
  extends Error {
  public constructor() {
    super(
      'El curso académico ya está archivado.',
    );

    this.name =
      'AcademicYearAlreadyArchivedError';
  }
}

export class AcademicYearNotArchivedError
  extends Error {
  public constructor() {
    super(
      'El curso académico no está archivado.',
    );

    this.name =
      'AcademicYearNotArchivedError';
  }
}

export class CannotArchiveCurrentAcademicYearError
  extends Error {
  public constructor() {
    super(
      'No se puede archivar el curso académico actual. Debes establecer primero otro curso como actual.',
    );

    this.name =
      'CannotArchiveCurrentAcademicYearError';
  }
}

export class CannotDeactivateCurrentAcademicYearError
  extends Error {
  public constructor() {
    super(
      'No se puede desactivar el curso académico actual.',
    );

    this.name =
      'CannotDeactivateCurrentAcademicYearError';
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

function toDatabaseDate(
  value: string,
): Date {
  return new Date(
    `${value}T00:00:00.000Z`,
  );
}

function formatDatabaseDate(
  value: Date,
): string {
  return value
    .toISOString()
    .slice(0, 10);
}

function mapAcademicYear(
  academicYear: AcademicYearRecord,
) {
  return {
    id: academicYear.id,
    name: academicYear.name,

    startDate: formatDatabaseDate(
      academicYear.startDate,
    ),

    endDate: formatDatabaseDate(
      academicYear.endDate,
    ),

    isCurrent: academicYear.isCurrent,
    isActive: academicYear.isActive,
    createdAt: academicYear.createdAt,
    updatedAt: academicYear.updatedAt,
    deletedAt: academicYear.deletedAt,
  };
}

async function ensureDateRangeIsAvailable(
  startDate: Date,
  endDate: Date,
  excludedAcademicYearId?: number,
): Promise<void> {
  const conflictingAcademicYear =
    await prisma.academicYear.findFirst({
      where: {
        deletedAt: null,

        ...(excludedAcademicYearId
          ? {
              id: {
                not: excludedAcademicYearId,
              },
            }
          : {}),

        startDate: {
          lte: endDate,
        },

        endDate: {
          gte: startDate,
        },
      },

      select: {
        id: true,
        name: true,
      },
    });

  if (conflictingAcademicYear) {
    throw new AcademicYearDateRangeOverlapError(
      conflictingAcademicYear.name,
    );
  }
}

export async function listAcademicYears(
  query: ListAcademicYearsQuery,
) {
  const {
    page,
    pageSize,
    search,
    status,
    current,
  } = query;

  const where: Prisma.AcademicYearWhereInput =
    {};

  if (search) {
    where.name = {
      contains: search,
    };
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

  if (current === 'current') {
    where.isCurrent = true;
  }

  if (current === 'not-current') {
    where.isCurrent = false;
  }

  const skip = (page - 1) * pageSize;

  const [
    total,
    academicYears,
  ] = await prisma.$transaction([
    prisma.academicYear.count({
      where,
    }),

    prisma.academicYear.findMany({
      where,
      skip,
      take: pageSize,

      orderBy: [
        {
          startDate: 'desc',
        },
        {
          id: 'desc',
        },
      ],

      select: academicYearSelect,
    }),
  ]);

  return {
    items: academicYears.map(
      mapAcademicYear,
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

export async function getAcademicYearById(
  academicYearId: number,
) {
  const academicYear =
    await prisma.academicYear.findUnique({
      where: {
        id: academicYearId,
      },

      select: academicYearSelect,
    });

  if (!academicYear) {
    throw new AcademicYearNotFoundError();
  }

  return mapAcademicYear(academicYear);
}

export async function createAcademicYear(
  input: CreateAcademicYearInput,
) {
  const startDate = toDatabaseDate(
    input.startDate,
  );

  const endDate = toDatabaseDate(
    input.endDate,
  );

  await ensureDateRangeIsAvailable(
    startDate,
    endDate,
  );

  try {
    const academicYear =
      await prisma.academicYear.create({
        data: {
          name: input.name.trim(),
          startDate,
          endDate,
          isCurrent: false,
          isActive: input.isActive,
        },

        select: academicYearSelect,
      });

    return mapAcademicYear(
      academicYear,
    );
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new AcademicYearNameAlreadyExistsError();
    }

    throw error;
  }
}

export async function updateAcademicYear(
  academicYearId: number,
  input: UpdateAcademicYearInput,
) {
  const existingAcademicYear =
    await prisma.academicYear.findUnique({
      where: {
        id: academicYearId,
      },

      select: {
        id: true,
        isCurrent: true,
        deletedAt: true,
      },
    });

  if (!existingAcademicYear) {
    throw new AcademicYearNotFoundError();
  }

  if (
    existingAcademicYear.deletedAt
    !== null
  ) {
    throw new AcademicYearArchivedError();
  }

  if (
    existingAcademicYear.isCurrent
    && !input.isActive
  ) {
    throw new CannotDeactivateCurrentAcademicYearError();
  }

  const startDate = toDatabaseDate(
    input.startDate,
  );

  const endDate = toDatabaseDate(
    input.endDate,
  );

  await ensureDateRangeIsAvailable(
    startDate,
    endDate,
    academicYearId,
  );

  try {
    const academicYear =
      await prisma.academicYear.update({
        where: {
          id: academicYearId,
        },

        data: {
          name: input.name.trim(),
          startDate,
          endDate,
          isActive: input.isActive,
        },

        select: academicYearSelect,
      });

    return mapAcademicYear(
      academicYear,
    );
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new AcademicYearNameAlreadyExistsError();
    }

    throw error;
  }
}

export async function setCurrentAcademicYear(
  academicYearId: number,
) {
  const academicYear =
    await prisma.$transaction(
      async (transaction) => {
        const existingAcademicYear =
          await transaction
            .academicYear
            .findUnique({
              where: {
                id: academicYearId,
              },

              select: {
                id: true,
                deletedAt: true,
              },
            });

        if (!existingAcademicYear) {
          throw new AcademicYearNotFoundError();
        }

        if (
          existingAcademicYear.deletedAt
          !== null
        ) {
          throw new AcademicYearArchivedError();
        }

        await transaction
          .academicYear
          .updateMany({
            where: {
              isCurrent: true,

              id: {
                not: academicYearId,
              },
            },

            data: {
              isCurrent: false,
            },
          });

        return transaction
          .academicYear
          .update({
            where: {
              id: academicYearId,
            },

            data: {
              isCurrent: true,
              isActive: true,
            },

            select: academicYearSelect,
          });
      },
    );

  return mapAcademicYear(
    academicYear,
  );
}

export async function archiveAcademicYear(
  academicYearId: number,
) {
  const existingAcademicYear =
    await prisma.academicYear.findUnique({
      where: {
        id: academicYearId,
      },

      select: {
        id: true,
        isCurrent: true,
        deletedAt: true,
      },
    });

  if (!existingAcademicYear) {
    throw new AcademicYearNotFoundError();
  }

  if (
    existingAcademicYear.deletedAt
    !== null
  ) {
    throw new AcademicYearAlreadyArchivedError();
  }

  if (existingAcademicYear.isCurrent) {
    throw new CannotArchiveCurrentAcademicYearError();
  }

  const academicYear =
    await prisma.academicYear.update({
      where: {
        id: academicYearId,
      },

      data: {
        isCurrent: false,
        isActive: false,
        deletedAt: new Date(),
      },

      select: academicYearSelect,
    });

  return mapAcademicYear(
    academicYear,
  );
}

export async function restoreAcademicYear(
  academicYearId: number,
) {
  const existingAcademicYear =
    await prisma.academicYear.findUnique({
      where: {
        id: academicYearId,
      },

      select: {
        id: true,
        startDate: true,
        endDate: true,
        deletedAt: true,
      },
    });

  if (!existingAcademicYear) {
    throw new AcademicYearNotFoundError();
  }

  if (
    existingAcademicYear.deletedAt
    === null
  ) {
    throw new AcademicYearNotArchivedError();
  }

  await ensureDateRangeIsAvailable(
    existingAcademicYear.startDate,
    existingAcademicYear.endDate,
    academicYearId,
  );

  const academicYear =
    await prisma.academicYear.update({
      where: {
        id: academicYearId,
      },

      data: {
        isCurrent: false,
        isActive: true,
        deletedAt: null,
      },

      select: academicYearSelect,
    });

  return mapAcademicYear(
    academicYear,
  );
}