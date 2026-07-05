import type {
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  CreateCompanyInput,
  CreateCompanyTutorInput,
  CreatePlacementFollowupInput,
  CreatePlacementIncidentInput,
  CreateWorkPlacementInput,
  ListCompaniesQuery,
  ListCompanyTutorsQuery,
  ListWorkPlacementsQuery,
  UpdateCompanyInput,
  UpdateCompanyTutorInput,
  UpdatePlacementFollowupInput,
  UpdatePlacementIncidentInput,
  UpdateWorkPlacementInput,
} from './company-training.schemas.js';

const workPlacementStatuses = [
  'PENDING',
  'ASSIGNED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
] as const;

export class CompanyTrainingError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'CompanyTrainingError';
  }
}

const companySelect = {
  id: true,
  name: true,
  taxIdentifier: true,
  sector: true,
  address: true,
  postalCode: true,
  city: true,
  province: true,
  phone: true,
  email: true,
  website: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  _count: {
    select: {
      companyTutors: true,
      workPlacements: true,
    },
  },
} satisfies Prisma.CompanySelect;

const companyTutorSelect = {
  id: true,
  companyId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  position: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  company: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.CompanyTutorSelect;

const workPlacementSelect = {
  id: true,
  studentId: true,
  academicYearId: true,
  centreId: true,
  companyId: true,
  companyTutorId: true,
  academicTutorUserId: true,
  status: true,
  startsAt: true,
  endsAt: true,
  schedule: true,
  totalHours: true,
  completedHours: true,
  activities: true,
  learningOutcomes: true,
  finalEvaluation: true,
  documentationPending: true,
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
    },
  },
  academicYear: {
    select: {
      id: true,
      name: true,
    },
  },
  centre: {
    select: {
      id: true,
      code: true,
      name: true,
      shortName: true,
    },
  },
  company: {
    select: {
      id: true,
      name: true,
    },
  },
  companyTutor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  },
  academicTutorUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.WorkPlacementSelect;


const placementFollowupSelect = {
  id: true,
  workPlacementId: true,
  createdByUserId: true,
  followupType: true,
  followupAt: true,
  title: true,
  description: true,
  nextActions: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  workPlacement: {
    select: {
      id: true,
      status: true,
      student: {
        select: {
          firstName: true,
          lastName1: true,
          lastName2: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  createdByUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.PlacementFollowupSelect;

const placementIncidentSelect = {
  id: true,
  workPlacementId: true,
  createdByUserId: true,
  severity: true,
  occurredAt: true,
  title: true,
  description: true,
  resolution: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  workPlacement: {
    select: {
      id: true,
      status: true,
      student: {
        select: {
          firstName: true,
          lastName1: true,
          lastName2: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  createdByUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.PlacementIncidentSelect;

type CompanyRecord =
  Prisma.CompanyGetPayload<{
    select: typeof companySelect;
  }>;

type CompanyTutorRecord =
  Prisma.CompanyTutorGetPayload<{
    select: typeof companyTutorSelect;
  }>;

type WorkPlacementRecord =
  Prisma.WorkPlacementGetPayload<{
    select: typeof workPlacementSelect;
  }>;

type PlacementFollowupRecord =
  Prisma.PlacementFollowupGetPayload<{
    select: typeof placementFollowupSelect;
  }>;

type PlacementIncidentRecord =
  Prisma.PlacementIncidentGetPayload<{
    select: typeof placementIncidentSelect;
  }>;

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

function normalizeDateTime(
  value: string,
): Date {
  return new Date(value);
}

function normalizeOptionalDateTime(
  value: string | undefined,
): Date | null {
  if (!value) {
    return null;
  }

  return normalizeDateTime(value);
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

function buildStudentFullName(
  student: Pick<
    WorkPlacementRecord['student'],
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

function buildCompanyTutorFullName(
  companyTutor: Pick<
    NonNullable<WorkPlacementRecord['companyTutor']>,
    | 'firstName'
    | 'lastName'
  >,
): string {
  return [
    companyTutor.firstName,
    companyTutor.lastName,
  ]
    .filter(Boolean)
    .join(' ');
}

type RecordStatusFilterableWhere = {
  isActive?: unknown;
  deletedAt?: unknown;
};

function applyRecordStatusFilter<
  TWhere extends RecordStatusFilterableWhere,
>(
  where: TWhere,
  status: 'all' | 'active' | 'inactive' | 'archived',
): void {
  if (status === 'active') {
    where.isActive = true as TWhere['isActive'];
    where.deletedAt = null as TWhere['deletedAt'];
  }

  if (status === 'inactive') {
    where.isActive = false as TWhere['isActive'];
    where.deletedAt = null as TWhere['deletedAt'];
  }

  if (status === 'archived') {
    where.deletedAt = {
      not: null,
    } as TWhere['deletedAt'];
  }
}

function mapCompany(
  company: CompanyRecord,
) {
  return {
    id: company.id,
    name: company.name,
    taxIdentifier: company.taxIdentifier,
    sector: company.sector,
    address: company.address,
    postalCode: company.postalCode,
    city: company.city,
    province: company.province,
    phone: company.phone,
    email: company.email,
    website: company.website,
    notes: company.notes,
    isActive: company.isActive,
    tutorsCount:
      company._count.companyTutors,
    placementsCount:
      company._count.workPlacements,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    deletedAt: company.deletedAt,
  };
}

function mapCompanyTutor(
  companyTutor: CompanyTutorRecord,
) {
  return {
    id: companyTutor.id,
    companyId: companyTutor.companyId,
    companyName: companyTutor.company.name,
    firstName: companyTutor.firstName,
    lastName: companyTutor.lastName,
    fullName: buildCompanyTutorFullName(
      companyTutor,
    ),
    email: companyTutor.email,
    phone: companyTutor.phone,
    position: companyTutor.position,
    notes: companyTutor.notes,
    isActive: companyTutor.isActive,
    createdAt: companyTutor.createdAt,
    updatedAt: companyTutor.updatedAt,
    deletedAt: companyTutor.deletedAt,
  };
}

function mapWorkPlacement(
  workPlacement: WorkPlacementRecord,
) {
  return {
    id: workPlacement.id,
    studentId: workPlacement.studentId,
    studentCode:
      workPlacement.student.studentCode,
    studentFullName:
      buildStudentFullName(
        workPlacement.student,
      ),
    academicYearId:
      workPlacement.academicYearId,
    academicYearName:
      workPlacement.academicYear.name,
    centreId: workPlacement.centreId,
    centreCode: workPlacement.centre.code,
    centreName:
      workPlacement.centre.shortName
      ?? workPlacement.centre.name,
    companyId: workPlacement.companyId,
    companyName:
      workPlacement.company.name,
    companyTutorId:
      workPlacement.companyTutorId,
    companyTutorFullName:
      workPlacement.companyTutor
        ? buildCompanyTutorFullName(
            workPlacement.companyTutor,
          )
        : null,
    academicTutorUserId:
      workPlacement.academicTutorUserId,
    academicTutorName:
      workPlacement.academicTutorUser?.name
      ?? null,
    status: workPlacement.status,
    startsAt:
      formatDateOnly(workPlacement.startsAt),
    endsAt:
      formatDateOnly(workPlacement.endsAt),
    schedule: workPlacement.schedule,
    totalHours: workPlacement.totalHours,
    completedHours:
      workPlacement.completedHours,
    activities: workPlacement.activities,
    learningOutcomes:
      workPlacement.learningOutcomes,
    finalEvaluation:
      workPlacement.finalEvaluation,
    documentationPending:
      workPlacement.documentationPending,
    remarks: workPlacement.remarks,
    createdAt: workPlacement.createdAt,
    updatedAt: workPlacement.updatedAt,
    deletedAt: workPlacement.deletedAt,
  };
}


function buildPlacementLabel(
  workPlacement: Pick<
    PlacementFollowupRecord['workPlacement'],
    'student' | 'company'
  >,
): string {
  return [
    buildStudentFullName(workPlacement.student),
    workPlacement.company.name,
  ].join(' · ');
}

function mapPlacementFollowup(
  followup: PlacementFollowupRecord,
) {
  return {
    id: followup.id,
    workPlacementId: followup.workPlacementId,
    workPlacementLabel:
      buildPlacementLabel(followup.workPlacement),
    companyId: followup.workPlacement.company.id,
    companyName: followup.workPlacement.company.name,
    studentFullName:
      buildStudentFullName(
        followup.workPlacement.student,
      ),
    createdByUserId: followup.createdByUserId,
    createdByUserName:
      followup.createdByUser?.name ?? null,
    createdByUserEmail:
      followup.createdByUser?.email ?? null,
    followupType: followup.followupType,
    followupAt: followup.followupAt.toISOString(),
    title: followup.title,
    description: followup.description,
    nextActions: followup.nextActions,
    createdAt: followup.createdAt,
    updatedAt: followup.updatedAt,
    deletedAt: followup.deletedAt,
  };
}

function mapPlacementIncident(
  incident: PlacementIncidentRecord,
) {
  return {
    id: incident.id,
    workPlacementId: incident.workPlacementId,
    workPlacementLabel:
      buildPlacementLabel(incident.workPlacement),
    companyId: incident.workPlacement.company.id,
    companyName: incident.workPlacement.company.name,
    studentFullName:
      buildStudentFullName(
        incident.workPlacement.student,
      ),
    createdByUserId: incident.createdByUserId,
    createdByUserName:
      incident.createdByUser?.name ?? null,
    createdByUserEmail:
      incident.createdByUser?.email ?? null,
    severity: incident.severity,
    occurredAt: incident.occurredAt.toISOString(),
    title: incident.title,
    description: incident.description,
    resolution: incident.resolution,
    resolvedAt:
      incident.resolvedAt?.toISOString() ?? null,
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
    deletedAt: incident.deletedAt,
  };
}

async function ensureCompanyIdentifiersAreAvailable(
  input: {
    name: string;
    taxIdentifier: string | undefined;
  },
  excludedCompanyId?: number,
): Promise<void> {
  const exclusionFilter =
    excludedCompanyId === undefined
      ? {}
      : {
          id: {
            not: excludedCompanyId,
          },
        };

  const companyWithSameName =
    await prisma.company.findFirst({
      where: {
        ...exclusionFilter,
        name: input.name.trim(),
      },
      select: {
        id: true,
      },
    });

  if (companyWithSameName) {
    throw new CompanyTrainingError(
      'COMPANY_NAME_ALREADY_EXISTS',
      'Ya existe una empresa con ese nombre.',
      409,
      'name',
    );
  }

  const normalizedTaxIdentifier =
    input.taxIdentifier
      ?.trim()
      .toUpperCase();

  if (!normalizedTaxIdentifier) {
    return;
  }

  const companyWithSameTaxIdentifier =
    await prisma.company.findFirst({
      where: {
        ...exclusionFilter,
        taxIdentifier:
          normalizedTaxIdentifier,
      },
      select: {
        id: true,
      },
    });

  if (companyWithSameTaxIdentifier) {
    throw new CompanyTrainingError(
      'COMPANY_TAX_IDENTIFIER_ALREADY_EXISTS',
      'Ya existe una empresa con ese identificador fiscal.',
      409,
      'taxIdentifier',
    );
  }
}

async function getActiveCompanyOrThrow(
  companyId: number,
) {
  const company =
    await prisma.company.findFirst({
      where: {
        id: companyId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

  if (!company) {
    throw new CompanyTrainingError(
      'COMPANY_NOT_FOUND',
      'La empresa solicitada no existe o no está activa.',
      404,
      'companyId',
    );
  }

  return company;
}

async function ensureWorkPlacementReferences(
  input: CreateWorkPlacementInput | UpdateWorkPlacementInput,
): Promise<void> {
  const [
    student,
    academicYear,
    centre,
    company,
  ] = await prisma.$transaction([
    prisma.student.findFirst({
      where: {
        id: input.studentId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    }),
    prisma.academicYear.findFirst({
      where: {
        id: input.academicYearId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    }),
    prisma.centre.findFirst({
      where: {
        id: input.centreId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    }),
    prisma.company.findFirst({
      where: {
        id: input.companyId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!student) {
    throw new CompanyTrainingError(
      'STUDENT_NOT_FOUND',
      'El alumno indicado no existe o no está activo.',
      422,
      'studentId',
    );
  }

  if (!academicYear) {
    throw new CompanyTrainingError(
      'ACADEMIC_YEAR_NOT_FOUND',
      'El curso académico indicado no existe o no está activo.',
      422,
      'academicYearId',
    );
  }

  if (!centre) {
    throw new CompanyTrainingError(
      'CENTRE_NOT_FOUND',
      'El centro indicado no existe o no está activo.',
      422,
      'centreId',
    );
  }

  if (!company) {
    throw new CompanyTrainingError(
      'COMPANY_NOT_FOUND',
      'La empresa indicada no existe o no está activa.',
      422,
      'companyId',
    );
  }

  if (input.companyTutorId) {
    const companyTutor =
      await prisma.companyTutor.findFirst({
        where: {
          id: input.companyTutorId,
          companyId: input.companyId,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

    if (!companyTutor) {
      throw new CompanyTrainingError(
        'COMPANY_TUTOR_NOT_FOUND',
        'El tutor laboral indicado no existe, no está activo o no pertenece a la empresa seleccionada.',
        422,
        'companyTutorId',
      );
    }
  }

  if (input.academicTutorUserId) {
    const academicTutor =
      await prisma.user.findFirst({
        where: {
          id: input.academicTutorUserId,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

    if (!academicTutor) {
      throw new CompanyTrainingError(
        'ACADEMIC_TUTOR_NOT_FOUND',
        'El tutor académico indicado no existe o no está activo.',
        422,
        'academicTutorUserId',
      );
    }
  }
}


async function ensureWorkPlacementIsAvailable(
  workPlacementId: number,
): Promise<void> {
  const workPlacement =
    await prisma.workPlacement.findUnique({
      where: {
        id: workPlacementId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!workPlacement) {
    throw new CompanyTrainingError(
      'WORK_PLACEMENT_NOT_FOUND',
      'La estancia formativa solicitada no existe.',
      404,
    );
  }

  if (workPlacement.deletedAt !== null) {
    throw new CompanyTrainingError(
      'WORK_PLACEMENT_ARCHIVED',
      'La estancia formativa está archivada y no admite nuevos registros.',
      409,
    );
  }
}

export async function getCompanyTrainingSummary() {
  const [
    companiesCount,
    activeCompanyTutorsCount,
    activePlacementsCount,
    placementsWithPendingDocumentationCount,
    openIncidentsCount,
    followupsCount,
    statusGroups,
  ] = await prisma.$transaction([
    prisma.company.count({
      where: {
        isActive: true,
        deletedAt: null,
      },
    }),
    prisma.companyTutor.count({
      where: {
        isActive: true,
        deletedAt: null,
      },
    }),
    prisma.workPlacement.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.workPlacement.count({
      where: {
        deletedAt: null,
        documentationPending: true,
      },
    }),
    prisma.placementIncident.count({
      where: {
        deletedAt: null,
        resolvedAt: null,
      },
    }),
    prisma.placementFollowup.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.workPlacement.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const byStatus = Object.fromEntries(
    workPlacementStatuses.map(
      (status) => [status, 0],
    ),
  ) as Record<
    typeof workPlacementStatuses[number],
    number
  >;

  for (const group of statusGroups) {
    byStatus[group.status] =
      group._count._all;
  }

  return {
    companiesCount,
    activeCompanyTutorsCount,
    activePlacementsCount,
    placementsWithPendingDocumentationCount,
    openIncidentsCount,
    followupsCount,
    placementsByStatus: byStatus,
  };
}

export async function listCompanies(
  query: ListCompaniesQuery,
) {
  const {
    page,
    pageSize,
    search,
    status,
  } = query;

  const where: Prisma.CompanyWhereInput = {};

  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
        },
      },
      {
        taxIdentifier: {
          contains: search,
        },
      },
      {
        sector: {
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

  applyRecordStatusFilter(
    where,
    status,
  );

  const skip =
    (page - 1) * pageSize;

  const [
    total,
    companies,
  ] = await prisma.$transaction([
    prisma.company.count({
      where,
    }),
    prisma.company.findMany({
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
      select: companySelect,
    }),
  ]);

  return {
    items: companies.map(mapCompany),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getCompanyById(
  companyId: number,
) {
  const company =
    await prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: companySelect,
    });

  if (!company) {
    throw new CompanyTrainingError(
      'COMPANY_NOT_FOUND',
      'La empresa solicitada no existe.',
      404,
    );
  }

  return mapCompany(company);
}

export async function createCompany(
  input: CreateCompanyInput,
) {
  await ensureCompanyIdentifiersAreAvailable({
    name: input.name,
    taxIdentifier:
      input.taxIdentifier,
  });

  try {
    const company =
      await prisma.company.create({
        data: {
          name: input.name.trim(),
          taxIdentifier:
            normalizeOptionalUppercaseText(
              input.taxIdentifier,
            ),
          sector:
            normalizeOptionalText(
              input.sector,
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
            input.email ?? null,
          website:
            normalizeOptionalText(
              input.website,
            ),
          notes:
            normalizeOptionalText(
              input.notes,
            ),
          isActive:
            input.isActive,
        },
        select: companySelect,
      });

    return mapCompany(company);
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new CompanyTrainingError(
        'COMPANY_IDENTIFIER_CONFLICT',
        'Ya existe una empresa con el nombre o identificador fiscal indicado.',
        409,
      );
    }

    throw error;
  }
}

export async function updateCompany(
  companyId: number,
  input: UpdateCompanyInput,
) {
  const existingCompany =
    await prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingCompany) {
    throw new CompanyTrainingError(
      'COMPANY_NOT_FOUND',
      'La empresa solicitada no existe.',
      404,
    );
  }

  if (existingCompany.deletedAt !== null) {
    throw new CompanyTrainingError(
      'COMPANY_ARCHIVED',
      'La empresa está archivada y no puede modificarse.',
      409,
    );
  }

  await ensureCompanyIdentifiersAreAvailable(
    {
      name: input.name,
      taxIdentifier:
        input.taxIdentifier,
    },
    companyId,
  );

  try {
    const company =
      await prisma.company.update({
        where: {
          id: companyId,
        },
        data: {
          name: input.name.trim(),
          taxIdentifier:
            normalizeOptionalUppercaseText(
              input.taxIdentifier,
            ),
          sector:
            normalizeOptionalText(
              input.sector,
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
            input.email ?? null,
          website:
            normalizeOptionalText(
              input.website,
            ),
          notes:
            normalizeOptionalText(
              input.notes,
            ),
          isActive:
            input.isActive,
        },
        select: companySelect,
      });

    return mapCompany(company);
  } catch (error: unknown) {
    if (
      isPrismaUniqueConstraintError(error)
    ) {
      throw new CompanyTrainingError(
        'COMPANY_IDENTIFIER_CONFLICT',
        'Ya existe una empresa con el nombre o identificador fiscal indicado.',
        409,
      );
    }

    throw error;
  }
}

export async function archiveCompany(
  companyId: number,
) {
  const existingCompany =
    await prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingCompany) {
    throw new CompanyTrainingError(
      'COMPANY_NOT_FOUND',
      'La empresa solicitada no existe.',
      404,
    );
  }

  if (existingCompany.deletedAt !== null) {
    throw new CompanyTrainingError(
      'COMPANY_ALREADY_ARCHIVED',
      'La empresa ya está archivada.',
      409,
    );
  }

  const company =
    await prisma.company.update({
      where: {
        id: companyId,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      select: companySelect,
    });

  return mapCompany(company);
}

export async function restoreCompany(
  companyId: number,
) {
  const existingCompany =
    await prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingCompany) {
    throw new CompanyTrainingError(
      'COMPANY_NOT_FOUND',
      'La empresa solicitada no existe.',
      404,
    );
  }

  if (existingCompany.deletedAt === null) {
    throw new CompanyTrainingError(
      'COMPANY_NOT_ARCHIVED',
      'La empresa no está archivada.',
      409,
    );
  }

  const company =
    await prisma.company.update({
      where: {
        id: companyId,
      },
      data: {
        isActive: true,
        deletedAt: null,
      },
      select: companySelect,
    });

  return mapCompany(company);
}

export async function listCompanyTutors(
  companyId: number,
  query: ListCompanyTutorsQuery,
) {
  await getActiveCompanyOrThrow(companyId);

  const where: Prisma.CompanyTutorWhereInput = {
    companyId,
  };

  applyRecordStatusFilter(
    where,
    query.status,
  );

  const companyTutors =
    await prisma.companyTutor.findMany({
      where,
      orderBy: [
        {
          lastName: 'asc',
        },
        {
          firstName: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      select: companyTutorSelect,
    });

  return {
    items:
      companyTutors.map(mapCompanyTutor),
  };
}

export async function createCompanyTutor(
  companyId: number,
  input: CreateCompanyTutorInput,
) {
  await getActiveCompanyOrThrow(companyId);

  const companyTutor =
    await prisma.companyTutor.create({
      data: {
        companyId,
        firstName:
          input.firstName.trim(),
        lastName:
          normalizeOptionalText(
            input.lastName,
          ),
        email:
          input.email ?? null,
        phone:
          normalizeOptionalText(
            input.phone,
          ),
        position:
          normalizeOptionalText(
            input.position,
          ),
        notes:
          normalizeOptionalText(
            input.notes,
          ),
        isActive:
          input.isActive,
      },
      select: companyTutorSelect,
    });

  return mapCompanyTutor(companyTutor);
}

export async function updateCompanyTutor(
  companyTutorId: number,
  input: UpdateCompanyTutorInput,
) {
  const existingCompanyTutor =
    await prisma.companyTutor.findUnique({
      where: {
        id: companyTutorId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingCompanyTutor) {
    throw new CompanyTrainingError(
      'COMPANY_TUTOR_NOT_FOUND',
      'El tutor laboral solicitado no existe.',
      404,
    );
  }

  if (existingCompanyTutor.deletedAt !== null) {
    throw new CompanyTrainingError(
      'COMPANY_TUTOR_ARCHIVED',
      'El tutor laboral está archivado y no puede modificarse.',
      409,
    );
  }

  const companyTutor =
    await prisma.companyTutor.update({
      where: {
        id: companyTutorId,
      },
      data: {
        firstName:
          input.firstName.trim(),
        lastName:
          normalizeOptionalText(
            input.lastName,
          ),
        email:
          input.email ?? null,
        phone:
          normalizeOptionalText(
            input.phone,
          ),
        position:
          normalizeOptionalText(
            input.position,
          ),
        notes:
          normalizeOptionalText(
            input.notes,
          ),
        isActive:
          input.isActive,
      },
      select: companyTutorSelect,
    });

  return mapCompanyTutor(companyTutor);
}

export async function archiveCompanyTutor(
  companyTutorId: number,
) {
  const existingCompanyTutor =
    await prisma.companyTutor.findUnique({
      where: {
        id: companyTutorId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingCompanyTutor) {
    throw new CompanyTrainingError(
      'COMPANY_TUTOR_NOT_FOUND',
      'El tutor laboral solicitado no existe.',
      404,
    );
  }

  if (existingCompanyTutor.deletedAt !== null) {
    throw new CompanyTrainingError(
      'COMPANY_TUTOR_ALREADY_ARCHIVED',
      'El tutor laboral ya está archivado.',
      409,
    );
  }

  const companyTutor =
    await prisma.companyTutor.update({
      where: {
        id: companyTutorId,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      select: companyTutorSelect,
    });

  return mapCompanyTutor(companyTutor);
}

export async function listWorkPlacements(
  query: ListWorkPlacementsQuery,
) {
  const {
    page,
    pageSize,
    search,
    recordStatus,
    status,
    academicYearId,
    centreId,
    companyId,
    studentId,
  } = query;

  const where: Prisma.WorkPlacementWhereInput = {};

  if (recordStatus === 'active') {
    where.deletedAt = null;
  }

  if (recordStatus === 'archived') {
    where.deletedAt = {
      not: null,
    };
  }

  if (status !== 'all') {
    where.status = status;
  }

  if (academicYearId) {
    where.academicYearId = academicYearId;
  }

  if (centreId) {
    where.centreId = centreId;
  }

  if (companyId) {
    where.companyId = companyId;
  }

  if (studentId) {
    where.studentId = studentId;
  }

  if (search) {
    where.OR = [
      {
        student: {
          studentCode: {
            contains: search,
          },
        },
      },
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
        company: {
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
    ];
  }

  const skip =
    (page - 1) * pageSize;

  const [
    total,
    workPlacements,
  ] = await prisma.$transaction([
    prisma.workPlacement.count({
      where,
    }),
    prisma.workPlacement.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        {
          startsAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      select: workPlacementSelect,
    }),
  ]);

  return {
    items:
      workPlacements.map(
        mapWorkPlacement,
      ),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getWorkPlacementById(
  workPlacementId: number,
) {
  const workPlacement =
    await prisma.workPlacement.findUnique({
      where: {
        id: workPlacementId,
      },
      select: workPlacementSelect,
    });

  if (!workPlacement) {
    throw new CompanyTrainingError(
      'WORK_PLACEMENT_NOT_FOUND',
      'La estancia formativa solicitada no existe.',
      404,
    );
  }

  return mapWorkPlacement(workPlacement);
}

export async function createWorkPlacement(
  input: CreateWorkPlacementInput,
) {
  await ensureWorkPlacementReferences(input);

  const workPlacement =
    await prisma.workPlacement.create({
      data: {
        studentId: input.studentId,
        academicYearId:
          input.academicYearId,
        centreId: input.centreId,
        companyId: input.companyId,
        companyTutorId:
          input.companyTutorId ?? null,
        academicTutorUserId:
          input.academicTutorUserId ?? null,
        status: input.status,
        startsAt:
          normalizeOptionalDate(
            input.startsAt,
          ),
        endsAt:
          normalizeOptionalDate(
            input.endsAt,
          ),
        schedule:
          normalizeOptionalText(
            input.schedule,
          ),
        totalHours:
          input.totalHours ?? null,
        completedHours:
          input.completedHours ?? null,
        activities:
          normalizeOptionalText(
            input.activities,
          ),
        learningOutcomes:
          normalizeOptionalText(
            input.learningOutcomes,
          ),
        finalEvaluation:
          normalizeOptionalText(
            input.finalEvaluation,
          ),
        documentationPending:
          input.documentationPending,
        remarks:
          normalizeOptionalText(
            input.remarks,
          ),
      },
      select: workPlacementSelect,
    });

  return mapWorkPlacement(workPlacement);
}

export async function updateWorkPlacement(
  workPlacementId: number,
  input: UpdateWorkPlacementInput,
) {
  const existingWorkPlacement =
    await prisma.workPlacement.findUnique({
      where: {
        id: workPlacementId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingWorkPlacement) {
    throw new CompanyTrainingError(
      'WORK_PLACEMENT_NOT_FOUND',
      'La estancia formativa solicitada no existe.',
      404,
    );
  }

  if (
    existingWorkPlacement.deletedAt
    !== null
  ) {
    throw new CompanyTrainingError(
      'WORK_PLACEMENT_ARCHIVED',
      'La estancia formativa está archivada y no puede modificarse.',
      409,
    );
  }

  await ensureWorkPlacementReferences(input);

  const workPlacement =
    await prisma.workPlacement.update({
      where: {
        id: workPlacementId,
      },
      data: {
        studentId: input.studentId,
        academicYearId:
          input.academicYearId,
        centreId: input.centreId,
        companyId: input.companyId,
        companyTutorId:
          input.companyTutorId ?? null,
        academicTutorUserId:
          input.academicTutorUserId ?? null,
        status: input.status,
        startsAt:
          normalizeOptionalDate(
            input.startsAt,
          ),
        endsAt:
          normalizeOptionalDate(
            input.endsAt,
          ),
        schedule:
          normalizeOptionalText(
            input.schedule,
          ),
        totalHours:
          input.totalHours ?? null,
        completedHours:
          input.completedHours ?? null,
        activities:
          normalizeOptionalText(
            input.activities,
          ),
        learningOutcomes:
          normalizeOptionalText(
            input.learningOutcomes,
          ),
        finalEvaluation:
          normalizeOptionalText(
            input.finalEvaluation,
          ),
        documentationPending:
          input.documentationPending,
        remarks:
          normalizeOptionalText(
            input.remarks,
          ),
      },
      select: workPlacementSelect,
    });

  return mapWorkPlacement(workPlacement);
}

export async function archiveWorkPlacement(
  workPlacementId: number,
) {
  const existingWorkPlacement =
    await prisma.workPlacement.findUnique({
      where: {
        id: workPlacementId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingWorkPlacement) {
    throw new CompanyTrainingError(
      'WORK_PLACEMENT_NOT_FOUND',
      'La estancia formativa solicitada no existe.',
      404,
    );
  }

  if (
    existingWorkPlacement.deletedAt
    !== null
  ) {
    throw new CompanyTrainingError(
      'WORK_PLACEMENT_ALREADY_ARCHIVED',
      'La estancia formativa ya está archivada.',
      409,
    );
  }

  const workPlacement =
    await prisma.workPlacement.update({
      where: {
        id: workPlacementId,
      },
      data: {
        deletedAt: new Date(),
      },
      select: workPlacementSelect,
    });

  return mapWorkPlacement(workPlacement);
}

export async function listPlacementFollowups(
  workPlacementId: number,
) {
  await ensureWorkPlacementIsAvailable(
    workPlacementId,
  );

  const followups =
    await prisma.placementFollowup.findMany({
      where: {
        workPlacementId,
        deletedAt: null,
      },
      orderBy: [
        {
          followupAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      select: placementFollowupSelect,
    });

  return {
    items: followups.map(mapPlacementFollowup),
  };
}

export async function createPlacementFollowup(
  workPlacementId: number,
  input: CreatePlacementFollowupInput,
  createdByUserId: number | null,
) {
  await ensureWorkPlacementIsAvailable(
    workPlacementId,
  );

  const followup =
    await prisma.placementFollowup.create({
      data: {
        workPlacementId,
        createdByUserId,
        followupType: input.followupType,
        followupAt: normalizeDateTime(
          input.followupAt,
        ),
        title: input.title.trim(),
        description:
          normalizeOptionalText(
            input.description,
          ),
        nextActions:
          normalizeOptionalText(
            input.nextActions,
          ),
      },
      select: placementFollowupSelect,
    });

  return mapPlacementFollowup(followup);
}

export async function updatePlacementFollowup(
  placementFollowupId: number,
  input: UpdatePlacementFollowupInput,
) {
  const existingFollowup =
    await prisma.placementFollowup.findUnique({
      where: {
        id: placementFollowupId,
      },
      select: {
        id: true,
        deletedAt: true,
        workPlacementId: true,
      },
    });

  if (!existingFollowup) {
    throw new CompanyTrainingError(
      'PLACEMENT_FOLLOWUP_NOT_FOUND',
      'El seguimiento solicitado no existe.',
      404,
    );
  }

  if (existingFollowup.deletedAt !== null) {
    throw new CompanyTrainingError(
      'PLACEMENT_FOLLOWUP_ARCHIVED',
      'El seguimiento está archivado y no puede modificarse.',
      409,
    );
  }

  await ensureWorkPlacementIsAvailable(
    existingFollowup.workPlacementId,
  );

  const followup =
    await prisma.placementFollowup.update({
      where: {
        id: placementFollowupId,
      },
      data: {
        followupType: input.followupType,
        followupAt: normalizeDateTime(
          input.followupAt,
        ),
        title: input.title.trim(),
        description:
          normalizeOptionalText(
            input.description,
          ),
        nextActions:
          normalizeOptionalText(
            input.nextActions,
          ),
      },
      select: placementFollowupSelect,
    });

  return mapPlacementFollowup(followup);
}

export async function archivePlacementFollowup(
  placementFollowupId: number,
) {
  const existingFollowup =
    await prisma.placementFollowup.findUnique({
      where: {
        id: placementFollowupId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingFollowup) {
    throw new CompanyTrainingError(
      'PLACEMENT_FOLLOWUP_NOT_FOUND',
      'El seguimiento solicitado no existe.',
      404,
    );
  }

  if (existingFollowup.deletedAt !== null) {
    throw new CompanyTrainingError(
      'PLACEMENT_FOLLOWUP_ALREADY_ARCHIVED',
      'El seguimiento ya está archivado.',
      409,
    );
  }

  const followup =
    await prisma.placementFollowup.update({
      where: {
        id: placementFollowupId,
      },
      data: {
        deletedAt: new Date(),
      },
      select: placementFollowupSelect,
    });

  return mapPlacementFollowup(followup);
}

export async function listPlacementIncidents(
  workPlacementId: number,
) {
  await ensureWorkPlacementIsAvailable(
    workPlacementId,
  );

  const incidents =
    await prisma.placementIncident.findMany({
      where: {
        workPlacementId,
        deletedAt: null,
      },
      orderBy: [
        {
          occurredAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      select: placementIncidentSelect,
    });

  return {
    items: incidents.map(mapPlacementIncident),
  };
}

export async function createPlacementIncident(
  workPlacementId: number,
  input: CreatePlacementIncidentInput,
  createdByUserId: number | null,
) {
  await ensureWorkPlacementIsAvailable(
    workPlacementId,
  );

  const incident =
    await prisma.placementIncident.create({
      data: {
        workPlacementId,
        createdByUserId,
        severity: input.severity,
        occurredAt: normalizeDateTime(
          input.occurredAt,
        ),
        title: input.title.trim(),
        description: input.description.trim(),
        resolution:
          normalizeOptionalText(
            input.resolution,
          ),
        resolvedAt:
          normalizeOptionalDateTime(
            input.resolvedAt,
          ),
      },
      select: placementIncidentSelect,
    });

  return mapPlacementIncident(incident);
}

export async function updatePlacementIncident(
  placementIncidentId: number,
  input: UpdatePlacementIncidentInput,
) {
  const existingIncident =
    await prisma.placementIncident.findUnique({
      where: {
        id: placementIncidentId,
      },
      select: {
        id: true,
        deletedAt: true,
        workPlacementId: true,
      },
    });

  if (!existingIncident) {
    throw new CompanyTrainingError(
      'PLACEMENT_INCIDENT_NOT_FOUND',
      'La incidencia solicitada no existe.',
      404,
    );
  }

  if (existingIncident.deletedAt !== null) {
    throw new CompanyTrainingError(
      'PLACEMENT_INCIDENT_ARCHIVED',
      'La incidencia está archivada y no puede modificarse.',
      409,
    );
  }

  await ensureWorkPlacementIsAvailable(
    existingIncident.workPlacementId,
  );

  const incident =
    await prisma.placementIncident.update({
      where: {
        id: placementIncidentId,
      },
      data: {
        severity: input.severity,
        occurredAt: normalizeDateTime(
          input.occurredAt,
        ),
        title: input.title.trim(),
        description: input.description.trim(),
        resolution:
          normalizeOptionalText(
            input.resolution,
          ),
        resolvedAt:
          normalizeOptionalDateTime(
            input.resolvedAt,
          ),
      },
      select: placementIncidentSelect,
    });

  return mapPlacementIncident(incident);
}

export async function archivePlacementIncident(
  placementIncidentId: number,
) {
  const existingIncident =
    await prisma.placementIncident.findUnique({
      where: {
        id: placementIncidentId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

  if (!existingIncident) {
    throw new CompanyTrainingError(
      'PLACEMENT_INCIDENT_NOT_FOUND',
      'La incidencia solicitada no existe.',
      404,
    );
  }

  if (existingIncident.deletedAt !== null) {
    throw new CompanyTrainingError(
      'PLACEMENT_INCIDENT_ALREADY_ARCHIVED',
      'La incidencia ya está archivada.',
      409,
    );
  }

  const incident =
    await prisma.placementIncident.update({
      where: {
        id: placementIncidentId,
      },
      data: {
        deletedAt: new Date(),
      },
      select: placementIncidentSelect,
    });

  return mapPlacementIncident(incident);
}
