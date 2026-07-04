import type {
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  CreateStudentInput,
  ListStudentsQuery,
  UpdateStudentInput,
} from './students.schemas.js';

const studentSelect = {
  id: true,
  studentCode: true,
  firstName: true,
  lastName1: true,
  lastName2: true,
  documentType: true,
  documentNumber: true,
  email: true,
  phone: true,
  birthDate: true,
  address: true,
  postalCode: true,
  city: true,
  province: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.StudentSelect;

type StudentRecord =
  Prisma.StudentGetPayload<{
    select: typeof studentSelect;
  }>;

export class StudentCodeAlreadyExistsError
  extends Error {
  public constructor() {
    super(
      'Ya existe un alumno con ese código.',
    );

    this.name =
      'StudentCodeAlreadyExistsError';
  }
}

export class StudentDocumentAlreadyExistsError
  extends Error {
  public constructor() {
    super(
      'Ya existe un alumno con ese número de documento.',
    );

    this.name =
      'StudentDocumentAlreadyExistsError';
  }
}

export class StudentIdentifierConflictError
  extends Error {
  public constructor() {
    super(
      'Ya existe un alumno con el código o documento indicado.',
    );

    this.name =
      'StudentIdentifierConflictError';
  }
}

export class StudentNotFoundError
  extends Error {
  public constructor() {
    super(
      'El alumno solicitado no existe.',
    );

    this.name =
      'StudentNotFoundError';
  }
}

export class StudentArchivedError
  extends Error {
  public constructor() {
    super(
      'El alumno está archivado y no puede modificarse.',
    );

    this.name =
      'StudentArchivedError';
  }
}

export class StudentAlreadyArchivedError
  extends Error {
  public constructor() {
    super(
      'El alumno ya está archivado.',
    );

    this.name =
      'StudentAlreadyArchivedError';
  }
}

export class StudentNotArchivedError
  extends Error {
  public constructor() {
    super(
      'El alumno no está archivado.',
    );

    this.name =
      'StudentNotArchivedError';
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

function normalizeOptionalDate(
  value: string | undefined,
): Date | null {
  if (!value) {
    return null;
  }

  return new Date(
    `${value}T00:00:00.000Z`,
  );
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

function buildFullName(
  student: Pick<
    StudentRecord,
    | 'firstName'
    | 'lastName1'
    | 'lastName2'
  >,
): string {
  return [
    student.firstName,
    student.lastName1,
    student.lastName2,
  ]
    .filter(Boolean)
    .join(' ');
}

function mapStudent(
  student: StudentRecord,
) {
  return {
    id: student.id,
    studentCode: student.studentCode,
    firstName: student.firstName,
    lastName1: student.lastName1,
    lastName2: student.lastName2,

    fullName:
      buildFullName(student),

    documentType:
      student.documentType,

    documentNumber:
      student.documentNumber,

    email: student.email,
    phone: student.phone,

    birthDate:
      formatDateOnly(student.birthDate),

    address: student.address,
    postalCode: student.postalCode,
    city: student.city,
    province: student.province,
    emergencyContactName:
      student.emergencyContactName,
    emergencyContactPhone:
      student.emergencyContactPhone,
    notes: student.notes,
    isActive: student.isActive,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
    deletedAt: student.deletedAt,
  };
}

async function ensureIdentifiersAreAvailable(
  input: {
    studentCode: string | undefined;
    documentNumber: string | undefined;
  },
  excludedStudentId?: number,
): Promise<void> {
  const exclusionFilter =
    excludedStudentId === undefined
      ? {}
      : {
          id: {
            not: excludedStudentId,
          },
        };

  const normalizedStudentCode =
    input.studentCode
      ?.trim()
      .toUpperCase();

  const normalizedDocumentNumber =
    input.documentNumber
      ?.trim()
      .toUpperCase();

  if (normalizedStudentCode) {
    const studentWithSameCode =
      await prisma.student.findFirst({
        where: {
          ...exclusionFilter,
          studentCode: normalizedStudentCode,
        },

        select: {
          id: true,
        },
      });

    if (studentWithSameCode) {
      throw new StudentCodeAlreadyExistsError();
    }
  }

  if (normalizedDocumentNumber) {
    const studentWithSameDocument =
      await prisma.student.findFirst({
        where: {
          ...exclusionFilter,
          documentNumber:
            normalizedDocumentNumber,
        },

        select: {
          id: true,
        },
      });

    if (studentWithSameDocument) {
      throw new StudentDocumentAlreadyExistsError();
    }
  }
}

export async function listStudents(
  query: ListStudentsQuery,
) {
  const {
    page,
    pageSize,
    search,
    status,
    documentType,
  } = query;

  const where: Prisma.StudentWhereInput = {};

  if (search) {
    where.OR = [
      {
        studentCode: {
          contains: search,
        },
      },
      {
        firstName: {
          contains: search,
        },
      },
      {
        lastName1: {
          contains: search,
        },
      },
      {
        lastName2: {
          contains: search,
        },
      },
      {
        documentNumber: {
          contains: search,
        },
      },
      {
        email: {
          contains: search,
        },
      },
      {
        phone: {
          contains: search,
        },
      },
    ];
  }

  if (documentType !== 'all') {
    where.documentType = documentType;
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
    students,
  ] = await prisma.$transaction([
    prisma.student.count({
      where,
    }),

    prisma.student.findMany({
      where,
      skip,
      take: pageSize,

      orderBy: [
        {
          lastName1: 'asc',
        },
        {
          lastName2: 'asc',
        },
        {
          firstName: 'asc',
        },
        {
          id: 'asc',
        },
      ],

      select: studentSelect,
    }),
  ]);

  return {
    items: students.map(mapStudent),

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

export async function getStudentById(
  studentId: number,
) {
  const student =
    await prisma.student.findUnique({
      where: {
        id: studentId,
      },

      select: studentSelect,
    });

  if (!student) {
    throw new StudentNotFoundError();
  }

  return mapStudent(student);
}

export async function createStudent(
  input: CreateStudentInput,
) {
  await ensureIdentifiersAreAvailable({
    studentCode: input.studentCode,
    documentNumber:
      input.documentNumber,
  });

  try {
    const student =
      await prisma.student.create({
        data: {
          studentCode:
            normalizeOptionalUppercaseText(
              input.studentCode,
            ),

          firstName:
            input.firstName.trim(),

          lastName1:
            input.lastName1.trim(),

          lastName2:
            normalizeOptionalText(
              input.lastName2,
            ),

          documentType:
            input.documentType ?? null,

          documentNumber:
            normalizeOptionalUppercaseText(
              input.documentNumber,
            ),

          email:
            input.email ?? null,

          phone:
            normalizeOptionalText(
              input.phone,
            ),

          birthDate:
            normalizeOptionalDate(
              input.birthDate,
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

          emergencyContactName:
            normalizeOptionalText(
              input.emergencyContactName,
            ),

          emergencyContactPhone:
            normalizeOptionalText(
              input.emergencyContactPhone,
            ),

          notes:
            normalizeOptionalText(
              input.notes,
            ),

          isActive:
            input.isActive,
        },

        select: studentSelect,
      });

    return mapStudent(student);
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new StudentIdentifierConflictError();
    }

    throw error;
  }
}

export async function updateStudent(
  studentId: number,
  input: UpdateStudentInput,
) {
  const existingStudent =
    await prisma.student.findUnique({
      where: {
        id: studentId,
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingStudent) {
    throw new StudentNotFoundError();
  }

  if (existingStudent.deletedAt !== null) {
    throw new StudentArchivedError();
  }

  await ensureIdentifiersAreAvailable(
    {
      studentCode: input.studentCode,
      documentNumber:
        input.documentNumber,
    },
    studentId,
  );

  try {
    const student =
      await prisma.student.update({
        where: {
          id: studentId,
        },

        data: {
          studentCode:
            normalizeOptionalUppercaseText(
              input.studentCode,
            ),

          firstName:
            input.firstName.trim(),

          lastName1:
            input.lastName1.trim(),

          lastName2:
            normalizeOptionalText(
              input.lastName2,
            ),

          documentType:
            input.documentType ?? null,

          documentNumber:
            normalizeOptionalUppercaseText(
              input.documentNumber,
            ),

          email:
            input.email ?? null,

          phone:
            normalizeOptionalText(
              input.phone,
            ),

          birthDate:
            normalizeOptionalDate(
              input.birthDate,
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

          emergencyContactName:
            normalizeOptionalText(
              input.emergencyContactName,
            ),

          emergencyContactPhone:
            normalizeOptionalText(
              input.emergencyContactPhone,
            ),

          notes:
            normalizeOptionalText(
              input.notes,
            ),

          isActive:
            input.isActive,
        },

        select: studentSelect,
      });

    return mapStudent(student);
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new StudentIdentifierConflictError();
    }

    throw error;
  }
}

export async function archiveStudent(
  studentId: number,
) {
  const existingStudent =
    await prisma.student.findUnique({
      where: {
        id: studentId,
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingStudent) {
    throw new StudentNotFoundError();
  }

  if (existingStudent.deletedAt !== null) {
    throw new StudentAlreadyArchivedError();
  }

  const student =
    await prisma.student.update({
      where: {
        id: studentId,
      },

      data: {
        isActive: false,
        deletedAt: new Date(),
      },

      select: studentSelect,
    });

  return mapStudent(student);
}

export async function restoreStudent(
  studentId: number,
) {
  const existingStudent =
    await prisma.student.findUnique({
      where: {
        id: studentId,
      },

      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingStudent) {
    throw new StudentNotFoundError();
  }

  if (existingStudent.deletedAt === null) {
    throw new StudentNotArchivedError();
  }

  const student =
    await prisma.student.update({
      where: {
        id: studentId,
      },

      data: {
        isActive: true,
        deletedAt: null,
      },

      select: studentSelect,
    });

  return mapStudent(student);
}
