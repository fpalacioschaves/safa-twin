import type {
  AssessmentComponentType,
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  CreateAssessmentSchemeInput,
  ListAssessmentSchemesQuery,
  UpdateAssessmentSchemeInput,
} from './assessment-schemes.schemas.js';

export class AssessmentSchemeAlreadyExistsError extends Error {
  constructor() {
    super(
      'Ya existe un sistema de calificación para el curso, centro y módulo seleccionados.',
    );
  }
}

export class AssessmentSchemeNotFoundError extends Error {
  constructor() {
    super('El sistema de calificación no existe.');
  }
}

export class AssessmentSchemeArchivedError extends Error {
  constructor() {
    super('El sistema de calificación está archivado.');
  }
}

export class AssessmentSchemeAlreadyArchivedError extends Error {
  constructor() {
    super('El sistema de calificación ya está archivado.');
  }
}

export class AssessmentSchemeNotArchivedError extends Error {
  constructor() {
    super('El sistema de calificación no está archivado.');
  }
}

export class AssessmentSchemeRelatedEntityUnavailableError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class AssessmentSchemeInvalidComponentsError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const assessmentSchemeSelect = {
  id: true,
  academicYearId: true,
  centreId: true,
  moduleId: true,
  name: true,
  isDual: true,
  isActive: true,
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
  module: {
    select: {
      id: true,
      vocationalProgrammeId: true,
      academicLevelId: true,
      code: true,
      name: true,
      acronym: true,
      totalHours: true,
      weeklyHours: true,
      sortOrder: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      vocationalProgramme: {
        select: {
          id: true,
          code: true,
          name: true,
          acronym: true,
          type: true,
          isActive: true,
          deletedAt: true,
        },
      },
      academicLevel: {
        select: {
          id: true,
          number: true,
          name: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  },
  components: {
    orderBy: [
      {
        sortOrder: 'asc',
      },
      {
        id: 'asc',
      },
    ],
    select: {
      id: true,
      assessmentSchemeId: true,
      code: true,
      name: true,
      type: true,
      percentage: true,
      sortOrder: true,
      isRequired: true,
      isCompanyComponent: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.AssessmentSchemeSelect;

type AssessmentSchemePayload =
  Prisma.AssessmentSchemeGetPayload<{
    select: typeof assessmentSchemeSelect;
  }>;

export type AssessmentSchemeListItem =
  ReturnType<typeof serializeAssessmentScheme>;

function serializeAssessmentScheme(
  scheme: AssessmentSchemePayload,
) {
  return {
    ...scheme,
    module: {
      ...scheme.module,
      weeklyHours:
        scheme.module.weeklyHours === null
          ? null
          : Number(scheme.module.weeklyHours),
    },
    components: scheme.components.map(
      (component) => ({
        ...component,
        percentage: Number(
          component.percentage,
        ),
      }),
    ),
  };
}

function normalizeName(name: string): string {
  return name.trim();
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function validateComponents(
  input: Pick<
    CreateAssessmentSchemeInput,
    | 'isDual'
    | 'components'
  >,
): void {
  const normalizedCodes =
    input.components.map((component) =>
      normalizeCode(component.code),
    );

  const uniqueCodes =
    new Set(normalizedCodes);

  if (uniqueCodes.size !== normalizedCodes.length) {
    throw new AssessmentSchemeInvalidComponentsError(
      'No puede haber componentes con el mismo código.',
    );
  }

  const totalPercentage =
    roundToTwoDecimals(
      input.components.reduce(
        (total, component) =>
          total + component.percentage,
        0,
      ),
    );

  if (totalPercentage !== 100) {
    throw new AssessmentSchemeInvalidComponentsError(
      `La suma de porcentajes debe ser 100%. Actualmente suma ${totalPercentage}%.`,
    );
  }

  const companyComponents =
    input.components.filter(
      (component) =>
        component.type === 'COMPANY'
        || component.isCompanyComponent,
    );

  if (
    input.isDual
    && companyComponents.length === 0
  ) {
    throw new AssessmentSchemeInvalidComponentsError(
      'Un sistema dualizado debe incluir un componente de empresa.',
    );
  }

  if (
    !input.isDual
    && companyComponents.length > 0
  ) {
    throw new AssessmentSchemeInvalidComponentsError(
      'Un sistema no dualizado no puede incluir componente de empresa.',
    );
  }

  if (companyComponents.length > 1) {
    throw new AssessmentSchemeInvalidComponentsError(
      'Solo puede existir un componente de empresa.',
    );
  }
}

function buildComponentsCreateData(
  components:
  CreateAssessmentSchemeInput['components'],
) {
  return components.map((component) => ({
    code: normalizeCode(component.code),
    name: component.name.trim(),
    type:
      component.type as AssessmentComponentType,
    percentage: component.percentage,
    sortOrder: component.sortOrder,
    isRequired: component.isRequired,
    isCompanyComponent:
      component.isCompanyComponent
      || component.type === 'COMPANY',
  }));
}

async function assertRelatedEntitiesAvailable(
  input: {
    academicYearId: number;
    centreId: number;
    moduleId: number;
  },
): Promise<void> {
  const [
    academicYear,
    centre,
    professionalModule,
  ] = await Promise.all([
    prisma.academicYear.findFirst({
      where: {
        id: input.academicYearId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    }),
    prisma.centre.findFirst({
      where: {
        id: input.centreId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    }),
    prisma.module.findFirst({
      where: {
        id: input.moduleId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!academicYear) {
    throw new AssessmentSchemeRelatedEntityUnavailableError(
      'El curso académico seleccionado no existe o no está activo.',
    );
  }

  if (!centre) {
    throw new AssessmentSchemeRelatedEntityUnavailableError(
      'El centro seleccionado no existe o no está activo.',
    );
  }

  if (!professionalModule) {
    throw new AssessmentSchemeRelatedEntityUnavailableError(
      'El módulo seleccionado no existe o no está activo.',
    );
  }
}

async function assertSchemeDoesNotExist(
  input: {
    academicYearId: number;
    centreId: number;
    moduleId: number;
  },
  excludedSchemeId?: number,
): Promise<void> {
  const existingScheme =
    await prisma.assessmentScheme.findFirst({
      where: {
        academicYearId: input.academicYearId,
        centreId: input.centreId,
        moduleId: input.moduleId,
        ...(excludedSchemeId
          ? {
            id: {
              not: excludedSchemeId,
            },
          }
          : {}),
      },
      select: {
        id: true,
      },
    });

  if (existingScheme) {
    throw new AssessmentSchemeAlreadyExistsError();
  }
}

async function getExistingScheme(
  assessmentSchemeId: number,
) {
  const scheme =
    await prisma.assessmentScheme.findUnique({
      where: {
        id: assessmentSchemeId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!scheme) {
    throw new AssessmentSchemeNotFoundError();
  }

  return scheme;
}

export async function listAssessmentSchemes(
  query: ListAssessmentSchemesQuery,
) {
  const where:
  Prisma.AssessmentSchemeWhereInput = {};

  if (query.status === 'archived') {
    where.deletedAt = {
      not: null,
    };
  } else {
    where.deletedAt = null;

    if (query.status === 'active') {
      where.isActive = true;
    }

    if (query.status === 'inactive') {
      where.isActive = false;
    }
  }

  if (query.dual === 'dual') {
    where.isDual = true;
  }

  if (query.dual === 'non-dual') {
    where.isDual = false;
  }

  if (query.academicYearId) {
    where.academicYearId = query.academicYearId;
  }

  if (query.centreId) {
    where.centreId = query.centreId;
  }

  if (query.moduleId) {
    where.moduleId = query.moduleId;
  }

  if (query.search) {
    where.OR = [
      {
        name: {
          contains: query.search,
        },
      },
      {
        module: {
          name: {
            contains: query.search,
          },
        },
      },
      {
        module: {
          code: {
            contains: query.search,
          },
        },
      },
      {
        module: {
          vocationalProgramme: {
            acronym: {
              contains: query.search,
            },
          },
        },
      },
    ];
  }

  const skip =
    (query.page - 1) * query.pageSize;

  const [
    total,
    assessmentSchemes,
  ] = await prisma.$transaction([
    prisma.assessmentScheme.count({
      where,
    }),
    prisma.assessmentScheme.findMany({
      where,
      select: assessmentSchemeSelect,
      orderBy: [
        {
          academicYear: {
            name: 'desc',
          },
        },
        {
          module: {
            code: 'asc',
          },
        },
        {
          id: 'asc',
        },
      ],
      skip,
      take: query.pageSize,
    }),
  ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(total / query.pageSize),
    );

  return {
    items: assessmentSchemes.map(
      serializeAssessmentScheme,
    ),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages,
    },
  };
}

export async function getAssessmentSchemeById(
  assessmentSchemeId: number,
) {
  const scheme =
    await prisma.assessmentScheme.findUnique({
      where: {
        id: assessmentSchemeId,
      },
      select: assessmentSchemeSelect,
    });

  if (!scheme) {
    throw new AssessmentSchemeNotFoundError();
  }

  return serializeAssessmentScheme(scheme);
}

export async function createAssessmentScheme(
  input: CreateAssessmentSchemeInput,
) {
  validateComponents(input);

  await assertRelatedEntitiesAvailable(input);
  await assertSchemeDoesNotExist(input);

  const assessmentScheme =
    await prisma.assessmentScheme.create({
      data: {
        academicYearId: input.academicYearId,
        centreId: input.centreId,
        moduleId: input.moduleId,
        name: normalizeName(input.name),
        isDual: input.isDual,
        isActive: input.isActive,
        remarks: input.remarks,
        components: {
          create: buildComponentsCreateData(
            input.components,
          ),
        },
      },
      select: assessmentSchemeSelect,
    });

  return serializeAssessmentScheme(
    assessmentScheme,
  );
}

export async function updateAssessmentScheme(
  assessmentSchemeId: number,
  input: UpdateAssessmentSchemeInput,
) {
  validateComponents(input);

  const existingScheme =
    await getExistingScheme(
      assessmentSchemeId,
    );

  if (existingScheme.deletedAt !== null) {
    throw new AssessmentSchemeArchivedError();
  }

  await assertRelatedEntitiesAvailable(input);

  await assertSchemeDoesNotExist(
    input,
    assessmentSchemeId,
  );

  const assessmentScheme =
    await prisma.$transaction(async (transaction) => {
      await transaction.assessmentComponent.deleteMany({
        where: {
          assessmentSchemeId,
        },
      });

      return await transaction.assessmentScheme.update({
        where: {
          id: assessmentSchemeId,
        },
        data: {
          academicYearId: input.academicYearId,
          centreId: input.centreId,
          moduleId: input.moduleId,
          name: normalizeName(input.name),
          isDual: input.isDual,
          isActive: input.isActive,
          remarks: input.remarks,
          components: {
            create: buildComponentsCreateData(
              input.components,
            ),
          },
        },
        select: assessmentSchemeSelect,
      });
    });

  return serializeAssessmentScheme(
    assessmentScheme,
  );
}

export async function archiveAssessmentScheme(
  assessmentSchemeId: number,
) {
  const existingScheme =
    await getExistingScheme(
      assessmentSchemeId,
    );

  if (existingScheme.deletedAt !== null) {
    throw new AssessmentSchemeAlreadyArchivedError();
  }

  const assessmentScheme =
    await prisma.assessmentScheme.update({
      where: {
        id: assessmentSchemeId,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
      select: assessmentSchemeSelect,
    });

  return serializeAssessmentScheme(
    assessmentScheme,
  );
}

export async function restoreAssessmentScheme(
  assessmentSchemeId: number,
) {
  const existingScheme =
    await getExistingScheme(
      assessmentSchemeId,
    );

  if (existingScheme.deletedAt === null) {
    throw new AssessmentSchemeNotArchivedError();
  }

  const assessmentScheme =
    await prisma.assessmentScheme.update({
      where: {
        id: assessmentSchemeId,
      },
      data: {
        deletedAt: null,
        isActive: true,
      },
      select: assessmentSchemeSelect,
    });

  return serializeAssessmentScheme(
    assessmentScheme,
  );
}
