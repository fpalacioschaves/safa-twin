import type {
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  CreateAcademicOfferingInput,
  ListAcademicOfferingsQuery,
  UpdateAcademicOfferingInput,
} from './academic-offerings.schemas.js';

const academicOfferingSelect = {
  id: true,
  academicYearId: true,
  centreId: true,
  vocationalProgrammeId: true,
  academicLevelId: true,
  modality: true,
  isActive: true,
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
      deletedAt: true,
    },
  },

  centreProgramme: {
    select: {
      isActive: true,
      deletedAt: true,

      centre: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
          city: true,
          province: true,
          isActive: true,
          deletedAt: true,
        },
      },

      vocationalProgramme: {
        select: {
          id: true,
          code: true,
          name: true,
          acronym: true,
          family: true,
          type: true,
          totalHours: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  },

  academicLevel: {
    select: {
      id: true,
      number: true,
      name: true,
      description: true,
      isActive: true,
      deletedAt: true,
    },
  },
} satisfies Prisma.AcademicOfferingSelect;

type AcademicOfferingRecord =
  Prisma.AcademicOfferingGetPayload<{
    select: typeof academicOfferingSelect;
  }>;

type AcademicOfferingScope = {
  academicYearId: number;
  centreId: number;
  vocationalProgrammeId: number;
  academicLevelId: number;
  modality:
    | 'PRESENTIAL'
    | 'ONLINE'
    | 'BLENDED';
};

export class AcademicOfferingAlreadyExistsError
  extends Error {
  public readonly existingOfferingId: number;
  public readonly existingOfferingIsArchived:
    boolean;

  public constructor(
    existingOfferingId: number,
    existingOfferingIsArchived: boolean,
  ) {
    super(
      existingOfferingIsArchived
        ? 'Ya existe una oferta académica archivada con la misma combinación. Debes restaurarla en lugar de crear otra.'
        : 'Ya existe una oferta académica con la misma combinación.',
    );

    this.name =
      'AcademicOfferingAlreadyExistsError';

    this.existingOfferingId =
      existingOfferingId;

    this.existingOfferingIsArchived =
      existingOfferingIsArchived;
  }
}

export class AcademicOfferingNotFoundError
  extends Error {
  public constructor() {
    super(
      'La oferta académica solicitada no existe.',
    );

    this.name =
      'AcademicOfferingNotFoundError';
  }
}

export class AcademicOfferingArchivedError
  extends Error {
  public constructor() {
    super(
      'La oferta académica está archivada y no puede modificarse.',
    );

    this.name =
      'AcademicOfferingArchivedError';
  }
}

export class AcademicOfferingAlreadyArchivedError
  extends Error {
  public constructor() {
    super(
      'La oferta académica ya está archivada.',
    );

    this.name =
      'AcademicOfferingAlreadyArchivedError';
  }
}

export class AcademicOfferingNotArchivedError
  extends Error {
  public constructor() {
    super(
      'La oferta académica no está archivada.',
    );

    this.name =
      'AcademicOfferingNotArchivedError';
  }
}

export class AcademicOfferingAssignmentChangeRequiresInactiveError
  extends Error {
  public constructor() {
    super(
      'No se puede cambiar el curso, centro, ciclo, nivel o modalidad de una oferta activa. Debes desactivarla primero.',
    );

    this.name =
      'AcademicOfferingAssignmentChangeRequiresInactiveError';
  }
}

export class OfferingAcademicYearNotFoundError
  extends Error {
  public constructor() {
    super(
      'El curso académico seleccionado no existe.',
    );

    this.name =
      'OfferingAcademicYearNotFoundError';
  }
}

export class OfferingAcademicYearUnavailableError
  extends Error {
  public constructor() {
    super(
      'El curso académico seleccionado está inactivo o archivado.',
    );

    this.name =
      'OfferingAcademicYearUnavailableError';
  }
}

export class OfferingCentreNotFoundError
  extends Error {
  public constructor() {
    super(
      'El centro seleccionado no existe.',
    );

    this.name =
      'OfferingCentreNotFoundError';
  }
}

export class OfferingCentreUnavailableError
  extends Error {
  public constructor() {
    super(
      'El centro seleccionado está inactivo o archivado.',
    );

    this.name =
      'OfferingCentreUnavailableError';
  }
}

export class OfferingProgrammeNotFoundError
  extends Error {
  public constructor() {
    super(
      'El ciclo formativo seleccionado no existe.',
    );

    this.name =
      'OfferingProgrammeNotFoundError';
  }
}

export class OfferingProgrammeUnavailableError
  extends Error {
  public constructor() {
    super(
      'El ciclo formativo seleccionado está inactivo o archivado.',
    );

    this.name =
      'OfferingProgrammeUnavailableError';
  }
}

export class OfferingAcademicLevelNotFoundError
  extends Error {
  public constructor() {
    super(
      'El nivel académico seleccionado no existe.',
    );

    this.name =
      'OfferingAcademicLevelNotFoundError';
  }
}

export class OfferingAcademicLevelUnavailableError
  extends Error {
  public constructor() {
    super(
      'El nivel académico seleccionado está inactivo o archivado.',
    );

    this.name =
      'OfferingAcademicLevelUnavailableError';
  }
}

export class OfferingCentreProgrammeNotFoundError
  extends Error {
  public constructor() {
    super(
      'El centro seleccionado no tiene asociado el ciclo formativo indicado.',
    );

    this.name =
      'OfferingCentreProgrammeNotFoundError';
  }
}

export class OfferingCentreProgrammeUnavailableError
  extends Error {
  public constructor() {
    super(
      'La asociación entre el centro y el ciclo está inactiva o archivada.',
    );

    this.name =
      'OfferingCentreProgrammeUnavailableError';
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

function formatDatabaseDate(
  value: Date,
): string {
  return value
    .toISOString()
    .slice(0, 10);
}

function mapAcademicOffering(
  academicOffering: AcademicOfferingRecord,
) {
  return {
    id: academicOffering.id,

    academicYearId:
      academicOffering.academicYearId,

    centreId:
      academicOffering.centreId,

    vocationalProgrammeId:
      academicOffering.vocationalProgrammeId,

    academicLevelId:
      academicOffering.academicLevelId,

    modality:
      academicOffering.modality,

    isActive:
      academicOffering.isActive,

    createdAt:
      academicOffering.createdAt,

    updatedAt:
      academicOffering.updatedAt,

    deletedAt:
      academicOffering.deletedAt,

    academicYear: {
      ...academicOffering.academicYear,

      startDate:
        formatDatabaseDate(
          academicOffering
            .academicYear
            .startDate,
        ),

      endDate:
        formatDatabaseDate(
          academicOffering
            .academicYear
            .endDate,
        ),
    },

    centre:
      academicOffering
        .centreProgramme
        .centre,

    vocationalProgramme:
      academicOffering
        .centreProgramme
        .vocationalProgramme,

    academicLevel:
      academicOffering.academicLevel,

    centreProgramme: {
      isActive:
        academicOffering
          .centreProgramme
          .isActive,

      deletedAt:
        academicOffering
          .centreProgramme
          .deletedAt,
    },
  };
}

async function ensureScopeIsAvailable(
  scope: AcademicOfferingScope,
  excludedAcademicOfferingId?: number,
): Promise<void> {
  const existingAcademicOffering =
    await prisma.academicOffering.findFirst({
      where: {
        academicYearId:
          scope.academicYearId,

        centreId:
          scope.centreId,

        vocationalProgrammeId:
          scope.vocationalProgrammeId,

        academicLevelId:
          scope.academicLevelId,

        modality:
          scope.modality,

        ...(excludedAcademicOfferingId
          === undefined
          ? {}
          : {
              id: {
                not:
                  excludedAcademicOfferingId,
              },
            }),
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (existingAcademicOffering) {
    throw new AcademicOfferingAlreadyExistsError(
      existingAcademicOffering.id,

      existingAcademicOffering.deletedAt
        !== null,
    );
  }
}

async function ensureDependenciesAreAvailable(
  scope: AcademicOfferingScope,
): Promise<void> {
  const [
    academicYear,
    centre,
    vocationalProgramme,
    academicLevel,
  ] = await prisma.$transaction([
    prisma.academicYear.findUnique({
      where: {
        id: scope.academicYearId,
      },

      select: {
        id: true,
        isActive: true,
        deletedAt: true,
      },
    }),

    prisma.centre.findUnique({
      where: {
        id: scope.centreId,
      },

      select: {
        id: true,
        isActive: true,
        deletedAt: true,
      },
    }),

    prisma.vocationalProgramme.findUnique({
      where: {
        id:
          scope.vocationalProgrammeId,
      },

      select: {
        id: true,
        isActive: true,
        deletedAt: true,
      },
    }),

    prisma.academicLevel.findUnique({
      where: {
        id: scope.academicLevelId,
      },

      select: {
        id: true,
        isActive: true,
        deletedAt: true,
      },
    }),
  ]);

  if (!academicYear) {
    throw new OfferingAcademicYearNotFoundError();
  }

  if (
    !academicYear.isActive
    || academicYear.deletedAt !== null
  ) {
    throw new OfferingAcademicYearUnavailableError();
  }

  if (!centre) {
    throw new OfferingCentreNotFoundError();
  }

  if (
    !centre.isActive
    || centre.deletedAt !== null
  ) {
    throw new OfferingCentreUnavailableError();
  }

  if (!vocationalProgramme) {
    throw new OfferingProgrammeNotFoundError();
  }

  if (
    !vocationalProgramme.isActive
    || vocationalProgramme.deletedAt
      !== null
  ) {
    throw new OfferingProgrammeUnavailableError();
  }

  if (!academicLevel) {
    throw new OfferingAcademicLevelNotFoundError();
  }

  if (
    !academicLevel.isActive
    || academicLevel.deletedAt !== null
  ) {
    throw new OfferingAcademicLevelUnavailableError();
  }

  const centreProgramme =
    await prisma.centreProgramme.findUnique({
      where: {
        centreId_vocationalProgrammeId: {
          centreId:
            scope.centreId,

          vocationalProgrammeId:
            scope.vocationalProgrammeId,
        },
      },

      select: {
        isActive: true,
        deletedAt: true,
      },
    });

  if (!centreProgramme) {
    throw new OfferingCentreProgrammeNotFoundError();
  }

  if (
    !centreProgramme.isActive
    || centreProgramme.deletedAt !== null
  ) {
    throw new OfferingCentreProgrammeUnavailableError();
  }
}

export async function listAcademicOfferings(
  query: ListAcademicOfferingsQuery,
) {
  const {
    page,
    pageSize,
    search,
    status,
    modality,
    academicYearId,
    centreId,
    vocationalProgrammeId,
    academicLevelId,
  } = query;

  const where:
    Prisma.AcademicOfferingWhereInput = {};

  if (search) {
    where.OR = [
      {
        academicYear: {
          name: {
            contains: search,
          },
        },
      },
      {
        centreProgramme: {
          centre: {
            code: {
              contains: search,
            },
          },
        },
      },
      {
        centreProgramme: {
          centre: {
            name: {
              contains: search,
            },
          },
        },
      },
      {
        centreProgramme: {
          centre: {
            shortName: {
              contains: search,
            },
          },
        },
      },
      {
        centreProgramme: {
          vocationalProgramme: {
            code: {
              contains: search,
            },
          },
        },
      },
      {
        centreProgramme: {
          vocationalProgramme: {
            name: {
              contains: search,
            },
          },
        },
      },
      {
        centreProgramme: {
          vocationalProgramme: {
            acronym: {
              contains: search,
            },
          },
        },
      },
      {
        academicLevel: {
          name: {
            contains: search,
          },
        },
      },
    ];
  }

  if (
    academicYearId !== undefined
  ) {
    where.academicYearId =
      academicYearId;
  }

  if (centreId !== undefined) {
    where.centreId = centreId;
  }

  if (
    vocationalProgrammeId
    !== undefined
  ) {
    where.vocationalProgrammeId =
      vocationalProgrammeId;
  }

  if (
    academicLevelId !== undefined
  ) {
    where.academicLevelId =
      academicLevelId;
  }

  if (modality !== 'all') {
    where.modality = modality;
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
    academicOfferings,
  ] = await prisma.$transaction([
    prisma.academicOffering.count({
      where,
    }),

    prisma.academicOffering.findMany({
      where,
      skip,
      take: pageSize,

      orderBy: [
        {
          academicYearId: 'desc',
        },
        {
          centreId: 'asc',
        },
        {
          vocationalProgrammeId: 'asc',
        },
        {
          academicLevelId: 'asc',
        },
        {
          modality: 'asc',
        },
        {
          id: 'asc',
        },
      ],

      select:
        academicOfferingSelect,
    }),
  ]);

  return {
    items: academicOfferings.map(
      mapAcademicOffering,
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

export async function getAcademicOfferingById(
  academicOfferingId: number,
) {
  const academicOffering =
    await prisma.academicOffering.findUnique({
      where: {
        id: academicOfferingId,
      },

      select: academicOfferingSelect,
    });

  if (!academicOffering) {
    throw new AcademicOfferingNotFoundError();
  }

  return mapAcademicOffering(
    academicOffering,
  );
}

export async function createAcademicOffering(
  input: CreateAcademicOfferingInput,
) {
  const scope: AcademicOfferingScope = {
    academicYearId:
      input.academicYearId,

    centreId:
      input.centreId,

    vocationalProgrammeId:
      input.vocationalProgrammeId,

    academicLevelId:
      input.academicLevelId,

    modality:
      input.modality,
  };

  await ensureDependenciesAreAvailable(
    scope,
  );

  await ensureScopeIsAvailable(
    scope,
  );

  try {
    const academicOffering =
      await prisma.academicOffering.create({
        data: {
          ...scope,
          isActive: input.isActive,
        },

        select:
          academicOfferingSelect,
      });

    return mapAcademicOffering(
      academicOffering,
    );
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      const existingAcademicOffering =
        await prisma
          .academicOffering
          .findFirst({
            where: scope,

            select: {
              id: true,
              deletedAt: true,
            },
          });

      throw new AcademicOfferingAlreadyExistsError(
        existingAcademicOffering?.id
          ?? 0,

        existingAcademicOffering
          ?.deletedAt !== null,
      );
    }

    throw error;
  }
}

export async function updateAcademicOffering(
  academicOfferingId: number,
  input: UpdateAcademicOfferingInput,
) {
  const existingAcademicOffering =
    await prisma.academicOffering.findUnique({
      where: {
        id: academicOfferingId,
      },

      select: {
        id: true,
        academicYearId: true,
        centreId: true,
        vocationalProgrammeId: true,
        academicLevelId: true,
        modality: true,
        isActive: true,
        deletedAt: true,
      },
    });

  if (!existingAcademicOffering) {
    throw new AcademicOfferingNotFoundError();
  }

  if (
    existingAcademicOffering.deletedAt
    !== null
  ) {
    throw new AcademicOfferingArchivedError();
  }

  const scope: AcademicOfferingScope = {
    academicYearId:
      input.academicYearId,

    centreId:
      input.centreId,

    vocationalProgrammeId:
      input.vocationalProgrammeId,

    academicLevelId:
      input.academicLevelId,

    modality:
      input.modality,
  };

  const assignmentHasChanged =
    existingAcademicOffering
      .academicYearId
      !== scope.academicYearId
    || existingAcademicOffering
      .centreId
      !== scope.centreId
    || existingAcademicOffering
      .vocationalProgrammeId
      !== scope.vocationalProgrammeId
    || existingAcademicOffering
      .academicLevelId
      !== scope.academicLevelId
    || existingAcademicOffering
      .modality
      !== scope.modality;

  if (
    existingAcademicOffering.isActive
    && assignmentHasChanged
  ) {
    throw new AcademicOfferingAssignmentChangeRequiresInactiveError();
  }

  if (
    assignmentHasChanged
    || input.isActive
  ) {
    await ensureDependenciesAreAvailable(
      scope,
    );
  }

  if (assignmentHasChanged) {
    await ensureScopeIsAvailable(
      scope,
      academicOfferingId,
    );
  }

  try {
    const academicOffering =
      await prisma.academicOffering.update({
        where: {
          id: academicOfferingId,
        },

        data: {
          ...scope,
          isActive: input.isActive,
        },

        select:
          academicOfferingSelect,
      });

    return mapAcademicOffering(
      academicOffering,
    );
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      const conflictingOffering =
        await prisma
          .academicOffering
          .findFirst({
            where: {
              ...scope,

              id: {
                not:
                  academicOfferingId,
              },
            },

            select: {
              id: true,
              deletedAt: true,
            },
          });

      throw new AcademicOfferingAlreadyExistsError(
        conflictingOffering?.id
          ?? 0,

        conflictingOffering
          ?.deletedAt !== null,
      );
    }

    throw error;
  }
}

export async function archiveAcademicOffering(
  academicOfferingId: number,
) {
  const existingAcademicOffering =
    await prisma.academicOffering.findUnique({
      where: {
        id: academicOfferingId,
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingAcademicOffering) {
    throw new AcademicOfferingNotFoundError();
  }

  if (
    existingAcademicOffering.deletedAt
    !== null
  ) {
    throw new AcademicOfferingAlreadyArchivedError();
  }

  const academicOffering =
    await prisma.academicOffering.update({
      where: {
        id: academicOfferingId,
      },

      data: {
        isActive: false,
        deletedAt: new Date(),
      },

      select:
        academicOfferingSelect,
    });

  return mapAcademicOffering(
    academicOffering,
  );
}

export async function restoreAcademicOffering(
  academicOfferingId: number,
) {
  const existingAcademicOffering =
    await prisma.academicOffering.findUnique({
      where: {
        id: academicOfferingId,
      },

      select: {
        id: true,
        academicYearId: true,
        centreId: true,
        vocationalProgrammeId: true,
        academicLevelId: true,
        modality: true,
        deletedAt: true,
      },
    });

  if (!existingAcademicOffering) {
    throw new AcademicOfferingNotFoundError();
  }

  if (
    existingAcademicOffering.deletedAt
    === null
  ) {
    throw new AcademicOfferingNotArchivedError();
  }

  const scope: AcademicOfferingScope = {
    academicYearId:
      existingAcademicOffering
        .academicYearId,

    centreId:
      existingAcademicOffering
        .centreId,

    vocationalProgrammeId:
      existingAcademicOffering
        .vocationalProgrammeId,

    academicLevelId:
      existingAcademicOffering
        .academicLevelId,

    modality:
      existingAcademicOffering
        .modality,
  };

  await ensureDependenciesAreAvailable(
    scope,
  );

  await ensureScopeIsAvailable(
    scope,
    academicOfferingId,
  );

  const academicOffering =
    await prisma.academicOffering.update({
      where: {
        id: academicOfferingId,
      },

      data: {
        isActive: true,
        deletedAt: null,
      },

      select:
        academicOfferingSelect,
    });

  return mapAcademicOffering(
    academicOffering,
  );
}