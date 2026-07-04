import type {
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  CreateEnrolmentInput,
  ListEnrolmentsQuery,
  UpdateEnrolmentInput,
} from './enrolments.schemas.js';

const enrolmentSelect = {
  id: true,
  studentId: true,
  academicYearId: true,
  centreId: true,
  moduleId: true,
  status: true,
  enrolledAt: true,
  cancelledAt: true,
  remarks: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,

  student: {
    select: {
      id: true,
      studentCode: true,
      firstName: true,
      lastName1: true,
      lastName2: true,
      documentNumber: true,
    },
  },

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

  module: {
    select: {
      id: true,
      code: true,
      name: true,
      acronym: true,
      totalHours: true,
      weeklyHours: true,
      isActive: true,
      deletedAt: true,

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
} satisfies Prisma.EnrolmentSelect;

type EnrolmentRecord =
  Prisma.EnrolmentGetPayload<{
    select: typeof enrolmentSelect;
  }>;

export class EnrolmentNotFoundError
  extends Error {
  public constructor() {
    super(
      'La matrícula solicitada no existe.',
    );

    this.name =
      'EnrolmentNotFoundError';
  }
}

export class EnrolmentAlreadyExistsError
  extends Error {
  public constructor() {
    super(
      'El alumno ya está matriculado en ese módulo para el curso y centro seleccionados.',
    );

    this.name =
      'EnrolmentAlreadyExistsError';
  }
}

export class EnrolmentArchivedError
  extends Error {
  public constructor() {
    super(
      'La matrícula está archivada y no puede modificarse.',
    );

    this.name =
      'EnrolmentArchivedError';
  }
}

export class EnrolmentAlreadyArchivedError
  extends Error {
  public constructor() {
    super(
      'La matrícula ya está archivada.',
    );

    this.name =
      'EnrolmentAlreadyArchivedError';
  }
}

export class EnrolmentNotArchivedError
  extends Error {
  public constructor() {
    super(
      'La matrícula no está archivada.',
    );

    this.name =
      'EnrolmentNotArchivedError';
  }
}

export class EnrolmentRelatedEntityUnavailableError
  extends Error {
  public constructor(
    entityName: string,
  ) {
    super(
      `${entityName} no existe, está inactivo o está archivado.`,
    );

    this.name =
      'EnrolmentRelatedEntityUnavailableError';
  }
}

export class EnrolmentInvalidCancellationDateError
  extends Error {
  public constructor() {
    super(
      'La fecha de baja no puede ser anterior a la fecha de matrícula.',
    );

    this.name =
      'EnrolmentInvalidCancellationDateError';
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

function formatDateOnly(
  value: Date | null,
): string | null {
  if (value === null) {
    return null;
  }

  return value
    .toISOString()
    .slice(0, 10);
}

function normalizeDate(
  value: string,
): Date {
  return new Date(
    `${value}T00:00:00.000Z`,
  );
}

function normalizeOptionalDate(
  value: string | undefined,
): Date | null {
  if (!value) {
    return null;
  }

  return normalizeDate(value);
}

function normalizeOptionalText(
  value: string | undefined,
): string | null {
  const normalizedValue =
    value?.trim();

  return normalizedValue || null;
}

function buildStudentFullName(
  student: EnrolmentRecord['student'],
): string {
  return [
    student.firstName,
    student.lastName1,
    student.lastName2,
  ]
    .filter(Boolean)
    .join(' ');
}

function mapEnrolment(
  enrolment: EnrolmentRecord,
) {
  return {
    id: enrolment.id,
    studentId: enrolment.studentId,
    academicYearId:
      enrolment.academicYearId,
    centreId: enrolment.centreId,
    moduleId: enrolment.moduleId,
    status: enrolment.status,

    enrolledAt:
      formatDateOnly(enrolment.enrolledAt),

    cancelledAt:
      formatDateOnly(enrolment.cancelledAt),

    remarks: enrolment.remarks,
    createdAt: enrolment.createdAt,
    updatedAt: enrolment.updatedAt,
    deletedAt: enrolment.deletedAt,

    student: {
      ...enrolment.student,
      fullName:
        buildStudentFullName(
          enrolment.student,
        ),
    },

    academicYear: {
      ...enrolment.academicYear,
      startDate:
        formatDateOnly(
          enrolment.academicYear.startDate,
        ),
      endDate:
        formatDateOnly(
          enrolment.academicYear.endDate,
        ),
    },

    centre: enrolment.centre,

    module: {
      ...enrolment.module,
      weeklyHours:
        enrolment.module.weeklyHours === null
          ? null
          : enrolment.module.weeklyHours.toString(),
    },
  };
}

async function ensureStudentIsAvailable(
  studentId: number,
): Promise<void> {
  const student =
    await prisma.student.findFirst({
      where: {
        id: studentId,
        isActive: true,
        deletedAt: null,
      },

      select: {
        id: true,
      },
    });

  if (!student) {
    throw new EnrolmentRelatedEntityUnavailableError(
      'El alumno',
    );
  }
}

async function ensureAcademicYearIsAvailable(
  academicYearId: number,
): Promise<void> {
  const academicYear =
    await prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        isActive: true,
        deletedAt: null,
      },

      select: {
        id: true,
      },
    });

  if (!academicYear) {
    throw new EnrolmentRelatedEntityUnavailableError(
      'El curso académico',
    );
  }
}

async function ensureCentreIsAvailable(
  centreId: number,
): Promise<void> {
  const centre =
    await prisma.centre.findFirst({
      where: {
        id: centreId,
        isActive: true,
        deletedAt: null,
      },

      select: {
        id: true,
      },
    });

  if (!centre) {
    throw new EnrolmentRelatedEntityUnavailableError(
      'El centro',
    );
  }
}

async function ensureModuleIsAvailable(
  moduleId: number,
): Promise<void> {
  const professionalModule =
    await prisma.module.findFirst({
      where: {
        id: moduleId,
        isActive: true,
        deletedAt: null,

        vocationalProgramme: {
          isActive: true,
          deletedAt: null,
        },

        academicLevel: {
          isActive: true,
          deletedAt: null,
        },
      },

      select: {
        id: true,
      },
    });

  if (!professionalModule) {
    throw new EnrolmentRelatedEntityUnavailableError(
      'El módulo',
    );
  }
}

async function ensureRelatedEntitiesAreAvailable(
  input: {
    studentId: number;
    academicYearId: number;
    centreId: number;
    moduleId: number;
  },
): Promise<void> {
  await Promise.all([
    ensureStudentIsAvailable(
      input.studentId,
    ),
    ensureAcademicYearIsAvailable(
      input.academicYearId,
    ),
    ensureCentreIsAvailable(
      input.centreId,
    ),
    ensureModuleIsAvailable(
      input.moduleId,
    ),
  ]);
}

async function ensureEnrolmentIsAvailable(
  input: {
    studentId: number;
    academicYearId: number;
    centreId: number;
    moduleId: number;
  },
  excludedEnrolmentId?: number,
): Promise<void> {
  const enrolment =
    await prisma.enrolment.findFirst({
      where: {
        studentId: input.studentId,
        academicYearId: input.academicYearId,
        centreId: input.centreId,
        moduleId: input.moduleId,

        ...(excludedEnrolmentId === undefined
          ? {}
          : {
              id: {
                not: excludedEnrolmentId,
              },
            }),
      },

      select: {
        id: true,
      },
    });

  if (enrolment) {
    throw new EnrolmentAlreadyExistsError();
  }
}

function ensureValidDates(
  enrolledAt: string,
  cancelledAt: string | undefined,
): void {
  if (!cancelledAt) {
    return;
  }

  const enrolledDate =
    normalizeDate(enrolledAt);

  const cancelledDate =
    normalizeDate(cancelledAt);

  if (
    cancelledDate.getTime()
    < enrolledDate.getTime()
  ) {
    throw new EnrolmentInvalidCancellationDateError();
  }
}

function buildWriteData(
  input: CreateEnrolmentInput | UpdateEnrolmentInput,
) {
  return {
    studentId: input.studentId,
    academicYearId: input.academicYearId,
    centreId: input.centreId,
    moduleId: input.moduleId,
    status: input.status,
    enrolledAt:
      normalizeDate(input.enrolledAt),

    cancelledAt:
      input.status === 'WITHDRAWN'
        ? normalizeOptionalDate(
            input.cancelledAt,
          )
        : null,

    remarks:
      normalizeOptionalText(
        input.remarks,
      ),
  };
}

export async function listEnrolments(
  query: ListEnrolmentsQuery,
) {
  const {
    page,
    pageSize,
    search,
    status,
    studentId,
    academicYearId,
    centreId,
    vocationalProgrammeId,
    academicLevelId,
    moduleId,
  } = query;

  const where: Prisma.EnrolmentWhereInput = {};

  if (search) {
    where.OR = [
      {
        student: {
          firstName: {
            contains: search,
          },
        },
      },
      {
        student: {
          lastName1: {
            contains: search,
          },
        },
      },
      {
        student: {
          lastName2: {
            contains: search,
          },
        },
      },
      {
        student: {
          studentCode: {
            contains: search,
          },
        },
      },
      {
        student: {
          documentNumber: {
            contains: search,
          },
        },
      },
      {
        academicYear: {
          name: {
            contains: search,
          },
        },
      },
      {
        centre: {
          name: {
            contains: search,
          },
        },
      },
      {
        centre: {
          code: {
            contains: search,
          },
        },
      },
      {
        module: {
          code: {
            contains: search,
          },
        },
      },
      {
        module: {
          name: {
            contains: search,
          },
        },
      },
      {
        module: {
          acronym: {
            contains: search,
          },
        },
      },
    ];
  }

  if (status !== 'all') {
    where.status = status;
  }

  if (studentId) {
    where.studentId = studentId;
  }

  if (academicYearId) {
    where.academicYearId = academicYearId;
  }

  if (centreId) {
    where.centreId = centreId;
  }

  if (moduleId) {
    where.moduleId = moduleId;
  }

  if (
    vocationalProgrammeId
    || academicLevelId
  ) {
    where.module = {
      ...(vocationalProgrammeId
        ? {
            vocationalProgrammeId,
          }
        : {}),

      ...(academicLevelId
        ? {
            academicLevelId,
          }
        : {}),
    };
  }

  const skip = (page - 1) * pageSize;

  const [
    total,
    enrolments,
  ] = await prisma.$transaction([
    prisma.enrolment.count({
      where,
    }),

    prisma.enrolment.findMany({
      where,
      skip,
      take: pageSize,

      orderBy: [
        {
          academicYear: {
            name: 'desc',
          },
        },
        {
          student: {
            lastName1: 'asc',
          },
        },
        {
          student: {
            lastName2: 'asc',
          },
        },
        {
          student: {
            firstName: 'asc',
          },
        },
        {
          module: {
            code: 'asc',
          },
        },
      ],

      select: enrolmentSelect,
    }),
  ]);

  return {
    items: enrolments.map(mapEnrolment),

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

export async function getEnrolmentById(
  enrolmentId: number,
) {
  const enrolment =
    await prisma.enrolment.findUnique({
      where: {
        id: enrolmentId,
      },

      select: enrolmentSelect,
    });

  if (!enrolment) {
    throw new EnrolmentNotFoundError();
  }

  return mapEnrolment(enrolment);
}

export async function createEnrolment(
  input: CreateEnrolmentInput,
) {
  ensureValidDates(
    input.enrolledAt,
    input.cancelledAt,
  );

  await ensureRelatedEntitiesAreAvailable(
    input,
  );

  await ensureEnrolmentIsAvailable(
    input,
  );

  try {
    const enrolment =
      await prisma.enrolment.create({
        data: buildWriteData(input),
        select: enrolmentSelect,
      });

    return mapEnrolment(enrolment);
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new EnrolmentAlreadyExistsError();
    }

    throw error;
  }
}

export async function updateEnrolment(
  enrolmentId: number,
  input: UpdateEnrolmentInput,
) {
  ensureValidDates(
    input.enrolledAt,
    input.cancelledAt,
  );

  const existingEnrolment =
    await prisma.enrolment.findUnique({
      where: {
        id: enrolmentId,
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingEnrolment) {
    throw new EnrolmentNotFoundError();
  }

  if (existingEnrolment.deletedAt !== null) {
    throw new EnrolmentArchivedError();
  }

  await ensureRelatedEntitiesAreAvailable(
    input,
  );

  await ensureEnrolmentIsAvailable(
    input,
    enrolmentId,
  );

  try {
    const enrolment =
      await prisma.enrolment.update({
        where: {
          id: enrolmentId,
        },

        data: buildWriteData(input),
        select: enrolmentSelect,
      });

    return mapEnrolment(enrolment);
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new EnrolmentAlreadyExistsError();
    }

    throw error;
  }
}

export async function archiveEnrolment(
  enrolmentId: number,
) {
  const existingEnrolment =
    await prisma.enrolment.findUnique({
      where: {
        id: enrolmentId,
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingEnrolment) {
    throw new EnrolmentNotFoundError();
  }

  if (
    existingEnrolment.deletedAt !== null
  ) {
    throw new EnrolmentAlreadyArchivedError();
  }

  const enrolment =
    await prisma.enrolment.update({
      where: {
        id: enrolmentId,
      },

      data: {
        deletedAt: new Date(),
      },

      select: enrolmentSelect,
    });

  return mapEnrolment(enrolment);
}

export async function restoreEnrolment(
  enrolmentId: number,
) {
  const existingEnrolment =
    await prisma.enrolment.findUnique({
      where: {
        id: enrolmentId,
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingEnrolment) {
    throw new EnrolmentNotFoundError();
  }

  if (existingEnrolment.deletedAt === null) {
    throw new EnrolmentNotArchivedError();
  }

  const enrolment =
    await prisma.enrolment.update({
      where: {
        id: enrolmentId,
      },

      data: {
        deletedAt: null,
      },

      select: enrolmentSelect,
    });

  return mapEnrolment(enrolment);
}
