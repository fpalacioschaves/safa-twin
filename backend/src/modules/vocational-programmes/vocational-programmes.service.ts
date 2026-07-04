import type {
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  CreateVocationalProgrammeInput,
  ListProgrammeCentresQuery,
  ListVocationalProgrammesQuery,
  UpdateVocationalProgrammeInput,
} from './vocational-programmes.schemas.js';

const vocationalProgrammeSelect = {
  id: true,
  code: true,
  name: true,
  acronym: true,
  family: true,
  type: true,
  totalHours: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.VocationalProgrammeSelect;

type VocationalProgrammeRecord =
  Prisma.VocationalProgrammeGetPayload<{
    select: typeof vocationalProgrammeSelect;
  }>;

export class VocationalProgrammeCodeAlreadyExistsError
  extends Error {
  public constructor() {
    super(
      'Ya existe un ciclo formativo con ese código.',
    );

    this.name =
      'VocationalProgrammeCodeAlreadyExistsError';
  }
}

export class VocationalProgrammeAcronymAlreadyExistsError
  extends Error {
  public constructor() {
    super(
      'Ya existe un ciclo formativo con esas siglas.',
    );

    this.name =
      'VocationalProgrammeAcronymAlreadyExistsError';
  }
}

export class VocationalProgrammeIdentifierConflictError
  extends Error {
  public constructor() {
    super(
      'Ya existe un ciclo con el código o las siglas indicadas.',
    );

    this.name =
      'VocationalProgrammeIdentifierConflictError';
  }
}

export class VocationalProgrammeNotFoundError
  extends Error {
  public constructor() {
    super(
      'El ciclo formativo solicitado no existe.',
    );

    this.name =
      'VocationalProgrammeNotFoundError';
  }
}

export class VocationalProgrammeArchivedError
  extends Error {
  public constructor() {
    super(
      'El ciclo formativo está archivado y no puede modificarse.',
    );

    this.name =
      'VocationalProgrammeArchivedError';
  }
}

export class VocationalProgrammeAlreadyArchivedError
  extends Error {
  public constructor() {
    super(
      'El ciclo formativo ya está archivado.',
    );

    this.name =
      'VocationalProgrammeAlreadyArchivedError';
  }
}

export class VocationalProgrammeNotArchivedError
  extends Error {
  public constructor() {
    super(
      'El ciclo formativo no está archivado.',
    );

    this.name =
      'VocationalProgrammeNotArchivedError';
  }
}

export class VocationalProgrammeUnavailableError
  extends Error {
  public constructor() {
    super(
      'El ciclo formativo debe estar activo y no archivado para asociarlo a un centro.',
    );

    this.name =
      'VocationalProgrammeUnavailableError';
  }
}

export class VocationalProgrammeHasActiveOfferingsError
  extends Error {
  public readonly activeOfferingCount: number;

  public constructor(
    activeOfferingCount: number,
  ) {
    super(
      'El ciclo formativo tiene ofertas académicas activas y no puede desactivarse ni archivarse.',
    );

    this.name =
      'VocationalProgrammeHasActiveOfferingsError';

    this.activeOfferingCount =
      activeOfferingCount;
  }
}

export class VocationalProgrammeHasActiveModulesError
  extends Error {
  public readonly activeModuleCount: number;

  public constructor(
    activeModuleCount: number,
  ) {
    super(
      'El ciclo formativo tiene módulos activos y no puede archivarse.',
    );

    this.name =
      'VocationalProgrammeHasActiveModulesError';

    this.activeModuleCount =
      activeModuleCount;
  }
}

export class AssociationCentreNotFoundError
  extends Error {
  public constructor() {
    super(
      'El centro indicado no existe.',
    );

    this.name =
      'AssociationCentreNotFoundError';
  }
}

export class AssociationCentreUnavailableError
  extends Error {
  public constructor() {
    super(
      'El centro debe estar activo y no archivado para asociarlo a un ciclo.',
    );

    this.name =
      'AssociationCentreUnavailableError';
  }
}

export class CentreProgrammeAssociationNotFoundError
  extends Error {
  public constructor() {
    super(
      'La asociación entre el centro y el ciclo no existe.',
    );

    this.name =
      'CentreProgrammeAssociationNotFoundError';
  }
}

export class CentreProgrammeAssociationAlreadyArchivedError
  extends Error {
  public constructor() {
    super(
      'La asociación entre el centro y el ciclo ya está archivada.',
    );

    this.name =
      'CentreProgrammeAssociationAlreadyArchivedError';
  }
}

export class CentreProgrammeAssociationHasActiveOfferingsError
  extends Error {
  public readonly activeOfferingCount: number;

  public constructor(
    activeOfferingCount: number,
  ) {
    super(
      'La asociación tiene ofertas académicas activas y no puede archivarse.',
    );

    this.name =
      'CentreProgrammeAssociationHasActiveOfferingsError';

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

function mapVocationalProgramme(
  programme: VocationalProgrammeRecord,
) {
  return {
    id: programme.id,
    code: programme.code,
    name: programme.name,
    acronym: programme.acronym,
    family: programme.family,
    type: programme.type,
    totalHours: programme.totalHours,
    description: programme.description,
    isActive: programme.isActive,
    createdAt: programme.createdAt,
    updatedAt: programme.updatedAt,
    deletedAt: programme.deletedAt,
  };
}

async function ensureIdentifiersAreAvailable(
  code: string,
  acronym: string,
  excludedProgrammeId?: number,
): Promise<void> {
  const exclusionFilter =
    excludedProgrammeId === undefined
      ? {}
      : {
          id: {
            not: excludedProgrammeId,
          },
        };

  const [
    programmeWithSameCode,
    programmeWithSameAcronym,
  ] = await prisma.$transaction([
    prisma.vocationalProgramme.findFirst({
      where: {
        ...exclusionFilter,
        code,
      },

      select: {
        id: true,
      },
    }),

    prisma.vocationalProgramme.findFirst({
      where: {
        ...exclusionFilter,
        acronym,
      },

      select: {
        id: true,
      },
    }),
  ]);

  if (programmeWithSameCode) {
    throw new VocationalProgrammeCodeAlreadyExistsError();
  }

  if (programmeWithSameAcronym) {
    throw new VocationalProgrammeAcronymAlreadyExistsError();
  }
}

async function getActiveOfferingCount(
  vocationalProgrammeId: number,
): Promise<number> {
  return prisma.academicOffering.count({
    where: {
      vocationalProgrammeId,
      isActive: true,
      deletedAt: null,
    },
  });
}

async function ensureProgrammeHasNoActiveOfferings(
  vocationalProgrammeId: number,
): Promise<void> {
  const activeOfferingCount =
    await getActiveOfferingCount(
      vocationalProgrammeId,
    );

  if (activeOfferingCount > 0) {
    throw new VocationalProgrammeHasActiveOfferingsError(
      activeOfferingCount,
    );
  }
}

async function ensureProgrammeHasNoActiveModules(
  vocationalProgrammeId: number,
): Promise<void> {
  const activeModuleCount =
    await prisma.module.count({
      where: {
        vocationalProgrammeId,
        isActive: true,
        deletedAt: null,
      },
    });

  if (activeModuleCount > 0) {
    throw new VocationalProgrammeHasActiveModulesError(
      activeModuleCount,
    );
  }
}

async function ensureProgrammeIsAvailableForAssociation(
  vocationalProgrammeId: number,
): Promise<void> {
  const programme =
    await prisma.vocationalProgramme.findUnique({
      where: {
        id: vocationalProgrammeId,
      },

      select: {
        id: true,
        isActive: true,
        deletedAt: true,
      },
    });

  if (!programme) {
    throw new VocationalProgrammeNotFoundError();
  }

  if (
    !programme.isActive
    || programme.deletedAt !== null
  ) {
    throw new VocationalProgrammeUnavailableError();
  }
}

async function ensureCentreIsAvailableForAssociation(
  centreId: number,
): Promise<void> {
  const centre =
    await prisma.centre.findUnique({
      where: {
        id: centreId,
      },

      select: {
        id: true,
        isActive: true,
        deletedAt: true,
      },
    });

  if (!centre) {
    throw new AssociationCentreNotFoundError();
  }

  if (
    !centre.isActive
    || centre.deletedAt !== null
  ) {
    throw new AssociationCentreUnavailableError();
  }
}

export async function listVocationalProgrammes(
  query: ListVocationalProgrammesQuery,
) {
  const {
    page,
    pageSize,
    search,
    status,
    type,
    centreId,
  } = query;

  const where:
    Prisma.VocationalProgrammeWhereInput = {};

  if (search) {
    where.OR = [
      {
        code: {
          contains: search,
        },
      },
      {
        name: {
          contains: search,
        },
      },
      {
        acronym: {
          contains: search,
        },
      },
      {
        family: {
          contains: search,
        },
      },
    ];
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

  if (type !== 'all') {
    where.type = type;
  }

  if (centreId !== undefined) {
    where.centreProgrammes = {
      some: {
        centreId,
        isActive: true,
        deletedAt: null,
      },
    };
  }

  const skip = (page - 1) * pageSize;

  const [
    total,
    programmes,
  ] = await prisma.$transaction([
    prisma.vocationalProgramme.count({
      where,
    }),

    prisma.vocationalProgramme.findMany({
      where,
      skip,
      take: pageSize,

      orderBy: [
        {
          name: 'asc',
        },
        {
          id: 'asc',
        },
      ],

      select: vocationalProgrammeSelect,
    }),
  ]);

  return {
    items: programmes.map(
      mapVocationalProgramme,
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

export async function getVocationalProgrammeById(
  vocationalProgrammeId: number,
) {
  const [
    programme,
    centreProgrammes,
    activeModuleCount,
    totalModuleCount,
    activeOfferingCount,
  ] = await prisma.$transaction([
    prisma.vocationalProgramme.findUnique({
      where: {
        id: vocationalProgrammeId,
      },

      select: vocationalProgrammeSelect,
    }),

    prisma.centreProgramme.findMany({
      where: {
        vocationalProgrammeId,
      },

      select: {
        isActive: true,
        createdAt: true,
        updatedAt: true,
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
      },
    }),

    prisma.module.count({
      where: {
        vocationalProgrammeId,
        isActive: true,
        deletedAt: null,
      },
    }),

    prisma.module.count({
      where: {
        vocationalProgrammeId,
      },
    }),

    prisma.academicOffering.count({
      where: {
        vocationalProgrammeId,
        isActive: true,
        deletedAt: null,
      },
    }),
  ]);

  if (!programme) {
    throw new VocationalProgrammeNotFoundError();
  }

  return {
    ...mapVocationalProgramme(programme),

    centres: centreProgrammes
      .map((association) => ({
        centre: association.centre,
        isActive: association.isActive,
        createdAt: association.createdAt,
        updatedAt: association.updatedAt,
        deletedAt: association.deletedAt,
      }))
      .sort(
        (
          firstAssociation,
          secondAssociation,
        ) =>
          firstAssociation.centre.name
            .localeCompare(
              secondAssociation.centre.name,
              'es',
            ),
      ),

    summary: {
      activeModuleCount,
      totalModuleCount,
      activeOfferingCount,
      centreCount:
        centreProgrammes.length,
    },
  };
}

export async function createVocationalProgramme(
  input: CreateVocationalProgrammeInput,
) {
  const code =
    input.code.trim().toUpperCase();

  const acronym =
    input.acronym.trim().toUpperCase();

  await ensureIdentifiersAreAvailable(
    code,
    acronym,
  );

  try {
    const programme =
      await prisma.vocationalProgramme.create({
        data: {
          code,
          name: input.name.trim(),
          acronym,

          family:
            normalizeOptionalText(
              input.family,
            ),

          type: input.type,

          totalHours:
            input.totalHours ?? null,

          description:
            normalizeOptionalText(
              input.description,
            ),

          isActive: input.isActive,
        },

        select: vocationalProgrammeSelect,
      });

    return mapVocationalProgramme(
      programme,
    );
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new VocationalProgrammeIdentifierConflictError();
    }

    throw error;
  }
}

export async function updateVocationalProgramme(
  vocationalProgrammeId: number,
  input: UpdateVocationalProgrammeInput,
) {
  const existingProgramme =
    await prisma.vocationalProgramme.findUnique({
      where: {
        id: vocationalProgrammeId,
      },

      select: {
        id: true,
        isActive: true,
        deletedAt: true,
      },
    });

  if (!existingProgramme) {
    throw new VocationalProgrammeNotFoundError();
  }

  if (
    existingProgramme.deletedAt !== null
  ) {
    throw new VocationalProgrammeArchivedError();
  }

  if (
    existingProgramme.isActive
    && !input.isActive
  ) {
    await ensureProgrammeHasNoActiveOfferings(
      vocationalProgrammeId,
    );
  }

  const code =
    input.code.trim().toUpperCase();

  const acronym =
    input.acronym.trim().toUpperCase();

  await ensureIdentifiersAreAvailable(
    code,
    acronym,
    vocationalProgrammeId,
  );

  try {
    const programme =
      await prisma.$transaction(
        async (transaction) => {
          if (!input.isActive) {
            await transaction
              .centreProgramme
              .updateMany({
                where: {
                  vocationalProgrammeId,
                  deletedAt: null,
                },

                data: {
                  isActive: false,
                },
              });
          }

          return transaction
            .vocationalProgramme
            .update({
              where: {
                id: vocationalProgrammeId,
              },

              data: {
                code,
                name: input.name.trim(),
                acronym,

                family:
                  normalizeOptionalText(
                    input.family,
                  ),

                type: input.type,

                totalHours:
                  input.totalHours ?? null,

                description:
                  normalizeOptionalText(
                    input.description,
                  ),

                isActive:
                  input.isActive,
              },

              select:
                vocationalProgrammeSelect,
            });
        },
      );

    return mapVocationalProgramme(
      programme,
    );
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new VocationalProgrammeIdentifierConflictError();
    }

    throw error;
  }
}

export async function archiveVocationalProgramme(
  vocationalProgrammeId: number,
) {
  const existingProgramme =
    await prisma.vocationalProgramme.findUnique({
      where: {
        id: vocationalProgrammeId,
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingProgramme) {
    throw new VocationalProgrammeNotFoundError();
  }

  if (
    existingProgramme.deletedAt !== null
  ) {
    throw new VocationalProgrammeAlreadyArchivedError();
  }

  await ensureProgrammeHasNoActiveOfferings(
    vocationalProgrammeId,
  );

  await ensureProgrammeHasNoActiveModules(
    vocationalProgrammeId,
  );

  const archivedAt = new Date();

  const programme =
    await prisma.$transaction(
      async (transaction) => {
        await transaction
          .centreProgramme
          .updateMany({
            where: {
              vocationalProgrammeId,
              deletedAt: null,
            },

            data: {
              isActive: false,
              deletedAt: archivedAt,
            },
          });

        return transaction
          .vocationalProgramme
          .update({
            where: {
              id: vocationalProgrammeId,
            },

            data: {
              isActive: false,
              deletedAt: archivedAt,
            },

            select:
              vocationalProgrammeSelect,
          });
      },
    );

  return mapVocationalProgramme(
    programme,
  );
}

export async function restoreVocationalProgramme(
  vocationalProgrammeId: number,
) {
  const existingProgramme =
    await prisma.vocationalProgramme.findUnique({
      where: {
        id: vocationalProgrammeId,
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingProgramme) {
    throw new VocationalProgrammeNotFoundError();
  }

  if (
    existingProgramme.deletedAt === null
  ) {
    throw new VocationalProgrammeNotArchivedError();
  }

  const programme =
    await prisma.vocationalProgramme.update({
      where: {
        id: vocationalProgrammeId,
      },

      data: {
        isActive: true,
        deletedAt: null,
      },

      select: vocationalProgrammeSelect,
    });

  return mapVocationalProgramme(
    programme,
  );
}

export async function listProgrammeCentres(
  vocationalProgrammeId: number,
  query: ListProgrammeCentresQuery,
) {
  const programme =
    await prisma.vocationalProgramme.findUnique({
      where: {
        id: vocationalProgrammeId,
      },

      select: {
        id: true,
      },
    });

  if (!programme) {
    throw new VocationalProgrammeNotFoundError();
  }

  const where:
    Prisma.CentreProgrammeWhereInput = {
      vocationalProgrammeId,
    };

  if (query.status === 'active') {
    where.isActive = true;
    where.deletedAt = null;
  }

  if (query.status === 'inactive') {
    where.isActive = false;
    where.deletedAt = null;
  }

  if (query.status === 'archived') {
    where.deletedAt = {
      not: null,
    };
  }

  const associations =
    await prisma.centreProgramme.findMany({
      where,

      select: {
        isActive: true,
        createdAt: true,
        updatedAt: true,
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
      },
    });

  return {
    items: associations
      .map((association) => ({
        centre: association.centre,
        isActive: association.isActive,
        createdAt: association.createdAt,
        updatedAt: association.updatedAt,
        deletedAt: association.deletedAt,
      }))
      .sort(
        (
          firstAssociation,
          secondAssociation,
        ) =>
          firstAssociation.centre.name
            .localeCompare(
              secondAssociation.centre.name,
              'es',
            ),
      ),
  };
}

export async function associateProgrammeWithCentre(
  vocationalProgrammeId: number,
  centreId: number,
) {
  await Promise.all([
    ensureProgrammeIsAvailableForAssociation(
      vocationalProgrammeId,
    ),

    ensureCentreIsAvailableForAssociation(
      centreId,
    ),
  ]);

  const association =
    await prisma.centreProgramme.upsert({
      where: {
        centreId_vocationalProgrammeId: {
          centreId,
          vocationalProgrammeId,
        },
      },

      update: {
        isActive: true,
        deletedAt: null,
      },

      create: {
        centreId,
        vocationalProgrammeId,
        isActive: true,
      },

      select: {
        isActive: true,
        createdAt: true,
        updatedAt: true,
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
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

  return association;
}

export async function archiveProgrammeCentreAssociation(
  vocationalProgrammeId: number,
  centreId: number,
) {
  const association =
    await prisma.centreProgramme.findUnique({
      where: {
        centreId_vocationalProgrammeId: {
          centreId,
          vocationalProgrammeId,
        },
      },

      select: {
        centreId: true,
        vocationalProgrammeId: true,
        deletedAt: true,
      },
    });

  if (!association) {
    throw new CentreProgrammeAssociationNotFoundError();
  }

  if (association.deletedAt !== null) {
    throw new CentreProgrammeAssociationAlreadyArchivedError();
  }

  const activeOfferingCount =
    await prisma.academicOffering.count({
      where: {
        centreId,
        vocationalProgrammeId,
        isActive: true,
        deletedAt: null,
      },
    });

  if (activeOfferingCount > 0) {
    throw new CentreProgrammeAssociationHasActiveOfferingsError(
      activeOfferingCount,
    );
  }

  const archivedAssociation =
    await prisma.centreProgramme.update({
      where: {
        centreId_vocationalProgrammeId: {
          centreId,
          vocationalProgrammeId,
        },
      },

      data: {
        isActive: false,
        deletedAt: new Date(),
      },

      select: {
        isActive: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,

        centre: {
          select: {
            id: true,
            code: true,
            name: true,
            shortName: true,
          },
        },

        vocationalProgramme: {
          select: {
            id: true,
            code: true,
            name: true,
            acronym: true,
          },
        },
      },
    });

  return archivedAssociation;
}