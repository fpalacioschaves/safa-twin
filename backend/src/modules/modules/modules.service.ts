import type {
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  CreateModuleInput,
  ListModulesQuery,
  UpdateModuleInput,
} from './modules.schemas.js';

const moduleSelect = {
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
} satisfies Prisma.ModuleSelect;

type ModuleRecord =
  Prisma.ModuleGetPayload<{
    select: typeof moduleSelect;
  }>;

export class ModuleCodeAlreadyExistsError
  extends Error {
  public constructor() {
    super(
      'Ya existe un módulo con ese código dentro del ciclo seleccionado.',
    );

    this.name =
      'ModuleCodeAlreadyExistsError';
  }
}

export class ModuleNotFoundError
  extends Error {
  public constructor() {
    super(
      'El módulo solicitado no existe.',
    );

    this.name =
      'ModuleNotFoundError';
  }
}

export class ModuleArchivedError
  extends Error {
  public constructor() {
    super(
      'El módulo está archivado y no puede modificarse.',
    );

    this.name =
      'ModuleArchivedError';
  }
}

export class ModuleAlreadyArchivedError
  extends Error {
  public constructor() {
    super(
      'El módulo ya está archivado.',
    );

    this.name =
      'ModuleAlreadyArchivedError';
  }
}

export class ModuleNotArchivedError
  extends Error {
  public constructor() {
    super(
      'El módulo no está archivado.',
    );

    this.name =
      'ModuleNotArchivedError';
  }
}

export class ModuleProgrammeNotFoundError
  extends Error {
  public constructor() {
    super(
      'El ciclo formativo seleccionado no existe.',
    );

    this.name =
      'ModuleProgrammeNotFoundError';
  }
}

export class ModuleProgrammeUnavailableError
  extends Error {
  public constructor() {
    super(
      'El ciclo formativo seleccionado está inactivo o archivado.',
    );

    this.name =
      'ModuleProgrammeUnavailableError';
  }
}

export class ModuleAcademicLevelNotFoundError
  extends Error {
  public constructor() {
    super(
      'El nivel académico seleccionado no existe.',
    );

    this.name =
      'ModuleAcademicLevelNotFoundError';
  }
}

export class ModuleAcademicLevelUnavailableError
  extends Error {
  public constructor() {
    super(
      'El nivel académico seleccionado está inactivo o archivado.',
    );

    this.name =
      'ModuleAcademicLevelUnavailableError';
  }
}

export class ModuleAssignmentChangeRequiresInactiveError
  extends Error {
  public constructor() {
    super(
      'No se puede cambiar el ciclo o el nivel de un módulo activo. Desactiva primero el módulo y vuelve a guardar antes de modificar su asignación.',
    );

    this.name =
      'ModuleAssignmentChangeRequiresInactiveError';
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

function mapModule(
  module: ModuleRecord,
) {
  return {
    id: module.id,

    vocationalProgrammeId:
      module.vocationalProgrammeId,

    academicLevelId:
      module.academicLevelId,

    code: module.code,
    name: module.name,
    acronym: module.acronym,
    totalHours: module.totalHours,

    weeklyHours:
      module.weeklyHours === null
        ? null
        : module.weeklyHours.toNumber(),

    sortOrder: module.sortOrder,
    isActive: module.isActive,
    createdAt: module.createdAt,
    updatedAt: module.updatedAt,
    deletedAt: module.deletedAt,

    vocationalProgramme:
      module.vocationalProgramme,

    academicLevel:
      module.academicLevel,
  };
}

async function ensureProgrammeIsAvailable(
  vocationalProgrammeId: number,
): Promise<void> {
  const vocationalProgramme =
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

  if (!vocationalProgramme) {
    throw new ModuleProgrammeNotFoundError();
  }

  if (
    !vocationalProgramme.isActive
    || vocationalProgramme.deletedAt !== null
  ) {
    throw new ModuleProgrammeUnavailableError();
  }
}

async function ensureAcademicLevelIsAvailable(
  academicLevelId: number,
): Promise<void> {
  const academicLevel =
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

  if (!academicLevel) {
    throw new ModuleAcademicLevelNotFoundError();
  }

  if (
    !academicLevel.isActive
    || academicLevel.deletedAt !== null
  ) {
    throw new ModuleAcademicLevelUnavailableError();
  }
}

async function ensureCodeIsAvailable(
  vocationalProgrammeId: number,
  code: string,
  excludedModuleId?: number,
): Promise<void> {
  const existingModule =
    await prisma.module.findFirst({
      where: {
        vocationalProgrammeId,
        code,

        ...(excludedModuleId === undefined
          ? {}
          : {
              id: {
                not: excludedModuleId,
              },
            }),
      },

      select: {
        id: true,
      },
    });

  if (existingModule) {
    throw new ModuleCodeAlreadyExistsError();
  }
}

export async function listModules(
  query: ListModulesQuery,
) {
  const {
    page,
    pageSize,
    search,
    status,
    vocationalProgrammeId,
    academicLevelId,
  } = query;

  const where: Prisma.ModuleWhereInput = {};

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
    ];
  }

  if (
    vocationalProgrammeId !== undefined
  ) {
    where.vocationalProgrammeId =
      vocationalProgrammeId;
  }

  if (academicLevelId !== undefined) {
    where.academicLevelId =
      academicLevelId;
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
    modules,
  ] = await prisma.$transaction([
    prisma.module.count({
      where,
    }),

    prisma.module.findMany({
      where,
      skip,
      take: pageSize,

      orderBy: [
        {
          vocationalProgrammeId: 'asc',
        },
        {
          academicLevelId: 'asc',
        },
        {
          sortOrder: 'asc',
        },
        {
          name: 'asc',
        },
        {
          id: 'asc',
        },
      ],

      select: moduleSelect,
    }),
  ]);

  return {
    items: modules.map(mapModule),

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

export async function getModuleById(
  moduleId: number,
) {
  const module =
    await prisma.module.findUnique({
      where: {
        id: moduleId,
      },

      select: moduleSelect,
    });

  if (!module) {
    throw new ModuleNotFoundError();
  }

  return mapModule(module);
}

export async function createModule(
  input: CreateModuleInput,
) {
  const code =
    input.code.trim().toUpperCase();

  await Promise.all([
    ensureProgrammeIsAvailable(
      input.vocationalProgrammeId,
    ),

    ensureAcademicLevelIsAvailable(
      input.academicLevelId,
    ),
  ]);

  await ensureCodeIsAvailable(
    input.vocationalProgrammeId,
    code,
  );

  try {
    const module =
      await prisma.module.create({
        data: {
          vocationalProgrammeId:
            input.vocationalProgrammeId,

          academicLevelId:
            input.academicLevelId,

          code,

          name:
            input.name.trim(),

          acronym:
            normalizeOptionalUppercaseText(
              input.acronym,
            ),

          totalHours:
            input.totalHours ?? null,

          weeklyHours:
            input.weeklyHours ?? null,

          sortOrder:
            input.sortOrder,

          isActive:
            input.isActive,
        },

        select: moduleSelect,
      });

    return mapModule(module);
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new ModuleCodeAlreadyExistsError();
    }

    throw error;
  }
}

export async function updateModule(
  moduleId: number,
  input: UpdateModuleInput,
) {
  const existingModule =
    await prisma.module.findUnique({
      where: {
        id: moduleId,
      },

      select: {
        id: true,
        vocationalProgrammeId: true,
        academicLevelId: true,
        isActive: true,
        deletedAt: true,
      },
    });

  if (!existingModule) {
    throw new ModuleNotFoundError();
  }

  if (existingModule.deletedAt !== null) {
    throw new ModuleArchivedError();
  }

  const assignmentHasChanged =
    existingModule.vocationalProgrammeId
      !== input.vocationalProgrammeId
    || existingModule.academicLevelId
      !== input.academicLevelId;

  if (
    existingModule.isActive
    && assignmentHasChanged
  ) {
    throw new ModuleAssignmentChangeRequiresInactiveError();
  }

  const code =
    input.code.trim().toUpperCase();

  await Promise.all([
    ensureProgrammeIsAvailable(
      input.vocationalProgrammeId,
    ),

    ensureAcademicLevelIsAvailable(
      input.academicLevelId,
    ),
  ]);

  await ensureCodeIsAvailable(
    input.vocationalProgrammeId,
    code,
    moduleId,
  );

  try {
    const module =
      await prisma.module.update({
        where: {
          id: moduleId,
        },

        data: {
          vocationalProgrammeId:
            input.vocationalProgrammeId,

          academicLevelId:
            input.academicLevelId,

          code,

          name:
            input.name.trim(),

          acronym:
            normalizeOptionalUppercaseText(
              input.acronym,
            ),

          totalHours:
            input.totalHours ?? null,

          weeklyHours:
            input.weeklyHours ?? null,

          sortOrder:
            input.sortOrder,

          isActive:
            input.isActive,
        },

        select: moduleSelect,
      });

    return mapModule(module);
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new ModuleCodeAlreadyExistsError();
    }

    throw error;
  }
}

export async function archiveModule(
  moduleId: number,
) {
  const existingModule =
    await prisma.module.findUnique({
      where: {
        id: moduleId,
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingModule) {
    throw new ModuleNotFoundError();
  }

  if (existingModule.deletedAt !== null) {
    throw new ModuleAlreadyArchivedError();
  }

  const module =
    await prisma.module.update({
      where: {
        id: moduleId,
      },

      data: {
        isActive: false,
        deletedAt: new Date(),
      },

      select: moduleSelect,
    });

  return mapModule(module);
}

export async function restoreModule(
  moduleId: number,
) {
  const existingModule =
    await prisma.module.findUnique({
      where: {
        id: moduleId,
      },

      select: {
        id: true,
        vocationalProgrammeId: true,
        academicLevelId: true,
        deletedAt: true,
      },
    });

  if (!existingModule) {
    throw new ModuleNotFoundError();
  }

  if (existingModule.deletedAt === null) {
    throw new ModuleNotArchivedError();
  }

  await Promise.all([
    ensureProgrammeIsAvailable(
      existingModule.vocationalProgrammeId,
    ),

    ensureAcademicLevelIsAvailable(
      existingModule.academicLevelId,
    ),
  ]);

  const module =
    await prisma.module.update({
      where: {
        id: moduleId,
      },

      data: {
        isActive: true,
        deletedAt: null,
      },

      select: moduleSelect,
    });

  return mapModule(module);
}