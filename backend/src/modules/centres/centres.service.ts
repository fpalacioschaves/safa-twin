import type {
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  CreateCentreInput,
  ListCentresQuery,
  UpdateCentreInput,
} from './centres.schemas.js';

const centreSelect = {
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
} satisfies Prisma.CentreSelect;

type CentreRecord =
  Prisma.CentreGetPayload<{
    select: typeof centreSelect;
  }>;

export class CentreCodeAlreadyExistsError
  extends Error {
  public constructor() {
    super(
      'Ya existe un centro con ese código.',
    );

    this.name =
      'CentreCodeAlreadyExistsError';
  }
}

export class CentreNotFoundError
  extends Error {
  public constructor() {
    super(
      'El centro solicitado no existe.',
    );

    this.name =
      'CentreNotFoundError';
  }
}

export class CentreArchivedError
  extends Error {
  public constructor() {
    super(
      'El centro está archivado y no puede modificarse.',
    );

    this.name =
      'CentreArchivedError';
  }
}

export class CentreAlreadyArchivedError
  extends Error {
  public constructor() {
    super(
      'El centro ya está archivado.',
    );

    this.name =
      'CentreAlreadyArchivedError';
  }
}

export class CentreNotArchivedError
  extends Error {
  public constructor() {
    super(
      'El centro no está archivado.',
    );

    this.name =
      'CentreNotArchivedError';
  }
}

export class CentreHasActiveAcademicOfferingsError
  extends Error {
  public readonly activeOfferingCount: number;

  public constructor(
    activeOfferingCount: number,
  ) {
    super(
      'El centro tiene ofertas académicas activas y no puede desactivarse ni archivarse.',
    );

    this.name =
      'CentreHasActiveAcademicOfferingsError';

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

function normalizeOptionalUppercaseText(
  value: string | undefined,
): string | null {
  const normalizedValue =
    value?.trim().toUpperCase();

  return normalizedValue || null;
}

function normalizeOptionalEmail(
  value: string | undefined,
): string | null {
  const normalizedValue =
    value?.trim().toLowerCase();

  return normalizedValue || null;
}

function mapCentre(
  centre: CentreRecord,
) {
  return {
    id: centre.id,
    code: centre.code,
    name: centre.name,
    shortName: centre.shortName,
    taxId: centre.taxId,
    address: centre.address,
    postalCode: centre.postalCode,
    city: centre.city,
    province: centre.province,
    phone: centre.phone,
    email: centre.email,
    isActive: centre.isActive,
    createdAt: centre.createdAt,
    updatedAt: centre.updatedAt,
    deletedAt: centre.deletedAt,
  };
}

async function getActiveAcademicOfferingCount(
  centreId: number,
): Promise<number> {
  return prisma.academicOffering.count({
    where: {
      centreId,
      isActive: true,
      deletedAt: null,
    },
  });
}

async function ensureCentreHasNoActiveOfferings(
  centreId: number,
): Promise<void> {
  const activeOfferingCount =
    await getActiveAcademicOfferingCount(
      centreId,
    );

  if (activeOfferingCount > 0) {
    throw new CentreHasActiveAcademicOfferingsError(
      activeOfferingCount,
    );
  }
}

export async function listCentres(
  query: ListCentresQuery,
) {
  const {
    page,
    pageSize,
    search,
    status,
  } = query;

  const where: Prisma.CentreWhereInput = {};

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
        shortName: {
          contains: search,
        },
      },
      {
        taxId: {
          contains: search,
        },
      },
      {
        city: {
          contains: search,
        },
      },
      {
        province: {
          contains: search,
        },
      },
      {
        email: {
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

  const skip = (page - 1) * pageSize;

  const [
    total,
    centres,
  ] = await prisma.$transaction([
    prisma.centre.count({
      where,
    }),

    prisma.centre.findMany({
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

      select: centreSelect,
    }),
  ]);

  return {
    items: centres.map(mapCentre),

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

export async function getCentreById(
  centreId: number,
) {
  const centre =
    await prisma.centre.findUnique({
      where: {
        id: centreId,
      },

      select: centreSelect,
    });

  if (!centre) {
    throw new CentreNotFoundError();
  }

  return mapCentre(centre);
}

export async function createCentre(
  input: CreateCentreInput,
) {
  try {
    const centre =
      await prisma.centre.create({
        data: {
          code:
            input.code.trim().toUpperCase(),

          name: input.name.trim(),

          shortName:
            normalizeOptionalText(
              input.shortName,
            ),

          taxId:
            normalizeOptionalUppercaseText(
              input.taxId,
            ),

          address:
            normalizeOptionalText(
              input.address,
            ),

          postalCode:
            normalizeOptionalText(
              input.postalCode,
            ),

          city:
            normalizeOptionalText(
              input.city,
            ),

          province:
            normalizeOptionalText(
              input.province,
            ),

          phone:
            normalizeOptionalText(
              input.phone,
            ),

          email:
            normalizeOptionalEmail(
              input.email,
            ),

          isActive: input.isActive,
        },

        select: centreSelect,
      });

    return mapCentre(centre);
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new CentreCodeAlreadyExistsError();
    }

    throw error;
  }
}

export async function updateCentre(
  centreId: number,
  input: UpdateCentreInput,
) {
  const existingCentre =
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

  if (!existingCentre) {
    throw new CentreNotFoundError();
  }

  if (existingCentre.deletedAt !== null) {
    throw new CentreArchivedError();
  }

  if (
    existingCentre.isActive
    && !input.isActive
  ) {
    await ensureCentreHasNoActiveOfferings(
      centreId,
    );
  }

  try {
    const centre =
      await prisma.centre.update({
        where: {
          id: centreId,
        },

        data: {
          code:
            input.code.trim().toUpperCase(),

          name: input.name.trim(),

          shortName:
            normalizeOptionalText(
              input.shortName,
            ),

          taxId:
            normalizeOptionalUppercaseText(
              input.taxId,
            ),

          address:
            normalizeOptionalText(
              input.address,
            ),

          postalCode:
            normalizeOptionalText(
              input.postalCode,
            ),

          city:
            normalizeOptionalText(
              input.city,
            ),

          province:
            normalizeOptionalText(
              input.province,
            ),

          phone:
            normalizeOptionalText(
              input.phone,
            ),

          email:
            normalizeOptionalEmail(
              input.email,
            ),

          isActive: input.isActive,
        },

        select: centreSelect,
      });

    return mapCentre(centre);
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new CentreCodeAlreadyExistsError();
    }

    throw error;
  }
}

export async function archiveCentre(
  centreId: number,
) {
  const existingCentre =
    await prisma.centre.findUnique({
      where: {
        id: centreId,
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingCentre) {
    throw new CentreNotFoundError();
  }

  if (existingCentre.deletedAt !== null) {
    throw new CentreAlreadyArchivedError();
  }

  await ensureCentreHasNoActiveOfferings(
    centreId,
  );

  const centre =
    await prisma.centre.update({
      where: {
        id: centreId,
      },

      data: {
        isActive: false,
        deletedAt: new Date(),
      },

      select: centreSelect,
    });

  return mapCentre(centre);
}

export async function restoreCentre(
  centreId: number,
) {
  const existingCentre =
    await prisma.centre.findUnique({
      where: {
        id: centreId,
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingCentre) {
    throw new CentreNotFoundError();
  }

  if (existingCentre.deletedAt === null) {
    throw new CentreNotArchivedError();
  }

  const centre =
    await prisma.centre.update({
      where: {
        id: centreId,
      },

      data: {
        isActive: true,
        deletedAt: null,
      },

      select: centreSelect,
    });

  return mapCentre(centre);
}