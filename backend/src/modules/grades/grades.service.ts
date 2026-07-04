import type {
  EvaluationStatus,
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  CreateGradeInput,
  ListGradesQuery,
  UpdateGradeInput,
} from './grades.schemas.js';

export class GradeAlreadyExistsError extends Error {
  constructor() {
    super(
      'Ya existe una calificación para esta matrícula en la evaluación seleccionada.',
    );
  }
}

export class GradeNotFoundError extends Error {
  constructor() {
    super('La calificación no existe.');
  }
}

export class GradeArchivedError extends Error {
  constructor() {
    super('La calificación está archivada.');
  }
}

export class GradeAlreadyArchivedError extends Error {
  constructor() {
    super('La calificación ya está archivada.');
  }
}

export class GradeNotArchivedError extends Error {
  constructor() {
    super('La calificación no está archivada.');
  }
}

export class GradeLockedError extends Error {
  constructor() {
    super(
      'La calificación o su evaluación están bloqueadas y no admiten cambios.',
    );
  }
}

export class GradeRelatedEntityUnavailableError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class GradeInvalidScoresError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const gradeSelect = {
  id: true,
  enrolmentId: true,
  evaluationId: true,
  assessmentSchemeId: true,
  gradeStatusId: true,
  numericGrade: true,
  finalGrade: true,
  isPassed: true,
  isLocked: true,
  remarks: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  enrolment: {
    select: {
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
    },
  },
  evaluation: {
    select: {
      id: true,
      academicYearId: true,
      centreId: true,
      code: true,
      name: true,
      sequence: true,
      startsAt: true,
      endsAt: true,
      status: true,
      closedAt: true,
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
    },
  },
  assessmentScheme: {
    select: {
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
    },
  },
  gradeStatus: {
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      isEvaluable: true,
      countsAsPassed: true,
      countsAsNoShow: true,
      sortOrder: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  },
  componentScores: {
    orderBy: [
      {
        assessmentComponent: {
          sortOrder: 'asc',
        },
      },
      {
        id: 'asc',
      },
    ],
    select: {
      id: true,
      gradeId: true,
      assessmentComponentId: true,
      score: true,
      weightedScore: true,
      isMissing: true,
      remarks: true,
      createdAt: true,
      updatedAt: true,
      assessmentComponent: {
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
    },
  },
} satisfies Prisma.GradeSelect;

type GradePayload =
  Prisma.GradeGetPayload<{
    select: typeof gradeSelect;
  }>;

type AssessmentSchemeWithComponents =
  Prisma.AssessmentSchemeGetPayload<{
    include: {
      components: true;
    };
  }>;

type GradeStatusPayload =
  Prisma.GradeStatusGetPayload<{}>;

export type GradeListItem =
  ReturnType<typeof serializeGrade>;

function getStudentFullName(
  student: {
    firstName: string;
    lastName1: string;
    lastName2: string | null;
  },
): string {
  return [
    student.firstName,
    student.lastName1,
    student.lastName2,
  ]
    .filter(Boolean)
    .join(' ');
}

function serializeGrade(
  grade: GradePayload,
) {
  return {
    ...grade,
    numericGrade:
      grade.numericGrade === null
        ? null
        : Number(grade.numericGrade),
    finalGrade:
      grade.finalGrade === null
        ? null
        : Number(grade.finalGrade),
    enrolment: {
      ...grade.enrolment,
      student: {
        ...grade.enrolment.student,
        fullName: getStudentFullName(
          grade.enrolment.student,
        ),
      },
      module: {
        ...grade.enrolment.module,
        weeklyHours:
          grade.enrolment.module.weeklyHours === null
            ? null
            : Number(
              grade.enrolment.module.weeklyHours,
            ),
      },
    },
    assessmentScheme: {
      ...grade.assessmentScheme,
      components:
        grade.assessmentScheme.components.map(
          (component) => ({
            ...component,
            percentage: Number(
              component.percentage,
            ),
          }),
        ),
    },
    componentScores:
      grade.componentScores.map(
        (componentScore) => ({
          ...componentScore,
          score:
            componentScore.score === null
              ? null
              : Number(componentScore.score),
          weightedScore:
            componentScore.weightedScore === null
              ? null
              : Number(
                componentScore.weightedScore,
              ),
          assessmentComponent: {
            ...componentScore.assessmentComponent,
            percentage: Number(
              componentScore.assessmentComponent
                .percentage,
            ),
          },
        }),
      ),
  };
}

function roundToTwoDecimals(
  value: number,
): number {
  return Math.round(value * 100) / 100;
}

function evaluationBlocksChanges(
  status: EvaluationStatus,
): boolean {
  return (
    status === 'CLOSED'
    || status === 'LOCKED'
  );
}

async function getActiveEnrolment(
  enrolmentId: number,
) {
  const enrolment =
    await prisma.enrolment.findUnique({
      where: {
        id: enrolmentId,
      },
      include: {
        student: true,
        module: true,
      },
    });

  if (
    !enrolment
    || enrolment.deletedAt !== null
  ) {
    throw new GradeRelatedEntityUnavailableError(
      'La matrícula seleccionada no existe o está archivada.',
    );
  }

  return enrolment;
}

async function getActiveEvaluation(
  evaluationId: number,
) {
  const evaluation =
    await prisma.evaluation.findUnique({
      where: {
        id: evaluationId,
      },
    });

  if (
    !evaluation
    || evaluation.deletedAt !== null
  ) {
    throw new GradeRelatedEntityUnavailableError(
      'La evaluación seleccionada no existe o está archivada.',
    );
  }

  return evaluation;
}

async function getActiveGradeStatus(
  gradeStatusId?: number,
): Promise<GradeStatusPayload | null> {
  if (!gradeStatusId) {
    return null;
  }

  const gradeStatus =
    await prisma.gradeStatus.findUnique({
      where: {
        id: gradeStatusId,
      },
    });

  if (
    !gradeStatus
    || gradeStatus.deletedAt !== null
    || !gradeStatus.isActive
  ) {
    throw new GradeRelatedEntityUnavailableError(
      'El estado de calificación seleccionado no existe, está archivado o está inactivo.',
    );
  }

  return gradeStatus;
}

async function getAssessmentSchemeForInput(
  input: CreateGradeInput | UpdateGradeInput,
  enrolment: Awaited<
    ReturnType<typeof getActiveEnrolment>
  >,
): Promise<AssessmentSchemeWithComponents> {
  const where =
    input.assessmentSchemeId
      ? {
        id: input.assessmentSchemeId,
      }
      : {
        academicYearId:
          enrolment.academicYearId,
        centreId: enrolment.centreId,
        moduleId: enrolment.moduleId,
        isActive: true,
        deletedAt: null,
      };

  const assessmentScheme =
    await prisma.assessmentScheme.findFirst({
      where,
      include: {
        components: {
          orderBy: [
            {
              sortOrder: 'asc',
            },
            {
              id: 'asc',
            },
          ],
        },
      },
    });

  if (
    !assessmentScheme
    || assessmentScheme.deletedAt !== null
    || !assessmentScheme.isActive
  ) {
    throw new GradeRelatedEntityUnavailableError(
      'No existe un sistema de calificación activo para el curso, centro y módulo de la matrícula.',
    );
  }

  if (
    assessmentScheme.academicYearId
      !== enrolment.academicYearId
    || assessmentScheme.centreId
      !== enrolment.centreId
    || assessmentScheme.moduleId
      !== enrolment.moduleId
  ) {
    throw new GradeRelatedEntityUnavailableError(
      'El sistema de calificación no pertenece al curso, centro y módulo de la matrícula.',
    );
  }

  return assessmentScheme;
}

function validateEvaluationScope(
  enrolment: Awaited<
    ReturnType<typeof getActiveEnrolment>
  >,
  evaluation: Awaited<
    ReturnType<typeof getActiveEvaluation>
  >,
): void {
  if (
    enrolment.academicYearId
      !== evaluation.academicYearId
    || enrolment.centreId
      !== evaluation.centreId
  ) {
    throw new GradeRelatedEntityUnavailableError(
      'La evaluación no pertenece al mismo curso académico y centro que la matrícula.',
    );
  }

  if (
    evaluationBlocksChanges(
      evaluation.status,
    )
  ) {
    throw new GradeLockedError();
  }
}

function calculateGrade(
  input: CreateGradeInput | UpdateGradeInput,
  assessmentScheme: AssessmentSchemeWithComponents,
  gradeStatus: GradeStatusPayload | null,
) {
  const scoreByComponent =
    new Map(
      input.componentScores.map(
        (componentScore) => [
          componentScore.assessmentComponentId,
          componentScore,
        ],
      ),
    );

  if (
    scoreByComponent.size
    !== input.componentScores.length
  ) {
    throw new GradeInvalidScoresError(
      'No puede haber dos notas para el mismo componente.',
    );
  }

  const componentIds =
    new Set(
      assessmentScheme.components.map(
        (component) => component.id,
      ),
    );

  for (const componentScore of input.componentScores) {
    if (
      !componentIds.has(
        componentScore.assessmentComponentId,
      )
    ) {
      throw new GradeInvalidScoresError(
        'Hay notas asociadas a componentes que no pertenecen al sistema de calificación seleccionado.',
      );
    }
  }

  const statusIsNonEvaluable =
    gradeStatus !== null
    && !gradeStatus.isEvaluable;

  const componentScoreData =
    assessmentScheme.components.map(
      (component) => {
        const componentScore =
          scoreByComponent.get(component.id);

        const score =
          componentScore?.score;

        const isMissing =
          componentScore?.isMissing ?? false;

        if (
          !statusIsNonEvaluable
          && component.isRequired
          && (
            score === undefined
            || isMissing
          )
        ) {
          throw new GradeInvalidScoresError(
            `Falta la nota obligatoria del componente ${component.name}.`,
          );
        }

        const weightedScore =
          score === undefined
            ? null
            : roundToTwoDecimals(
              score
              * Number(component.percentage)
              / 100,
            );

        return {
          assessmentComponentId: component.id,
          score: score ?? null,
          weightedScore,
          isMissing,
          remarks:
            componentScore?.remarks ?? null,
        };
      },
    );

  if (statusIsNonEvaluable) {
    return {
      numericGrade: null,
      finalGrade: null,
      isPassed:
        gradeStatus.countsAsPassed,
      componentScoreData,
    };
  }

  const finalGrade =
    roundToTwoDecimals(
      componentScoreData.reduce(
        (total, componentScore) =>
          total
          + (
            componentScore.weightedScore ?? 0
          ),
        0,
      ),
    );

  return {
    numericGrade: finalGrade,
    finalGrade,
    isPassed: finalGrade >= 5,
    componentScoreData,
  };
}

async function validateGradeInput(
  input: CreateGradeInput | UpdateGradeInput,
) {
  const enrolment =
    await getActiveEnrolment(
      input.enrolmentId,
    );

  const evaluation =
    await getActiveEvaluation(
      input.evaluationId,
    );

  validateEvaluationScope(
    enrolment,
    evaluation,
  );

  const assessmentScheme =
    await getAssessmentSchemeForInput(
      input,
      enrolment,
    );

  const gradeStatus =
    await getActiveGradeStatus(
      input.gradeStatusId,
    );

  const calculatedGrade =
    calculateGrade(
      input,
      assessmentScheme,
      gradeStatus,
    );

  return {
    enrolment,
    evaluation,
    assessmentScheme,
    gradeStatus,
    calculatedGrade,
  };
}

async function getGradeOrThrow(
  gradeId: number,
): Promise<GradePayload> {
  const grade =
    await prisma.grade.findUnique({
      where: {
        id: gradeId,
      },
      select: gradeSelect,
    });

  if (!grade) {
    throw new GradeNotFoundError();
  }

  return grade;
}

export async function listGrades(
  query: ListGradesQuery,
) {
  const where: Prisma.GradeWhereInput = {};

  if (query.status === 'active') {
    where.deletedAt = null;
  }

  if (query.status === 'archived') {
    where.deletedAt = {
      not: null,
    };
  }

  if (query.enrolmentId) {
    where.enrolmentId = query.enrolmentId;
  }

  if (query.evaluationId) {
    where.evaluationId = query.evaluationId;
  }

  const enrolmentWhere:
  Prisma.EnrolmentWhereInput = {};

  if (query.academicYearId) {
    enrolmentWhere.academicYearId =
      query.academicYearId;
  }

  if (query.centreId) {
    enrolmentWhere.centreId =
      query.centreId;
  }

  if (query.moduleId) {
    enrolmentWhere.moduleId =
      query.moduleId;
  }

  if (
    Object.keys(enrolmentWhere).length > 0
  ) {
    where.enrolment = {
      is: enrolmentWhere,
    };
  }

  if (query.search) {
    where.OR = [
      {
        enrolment: {
          student: {
            firstName: {
              contains: query.search,
            },
          },
        },
      },
      {
        enrolment: {
          student: {
            lastName1: {
              contains: query.search,
            },
          },
        },
      },
      {
        enrolment: {
          student: {
            lastName2: {
              contains: query.search,
            },
          },
        },
      },
      {
        enrolment: {
          student: {
            documentNumber: {
              contains: query.search,
            },
          },
        },
      },
      {
        enrolment: {
          module: {
            name: {
              contains: query.search,
            },
          },
        },
      },
      {
        enrolment: {
          module: {
            code: {
              contains: query.search,
            },
          },
        },
      },
      {
        evaluation: {
          name: {
            contains: query.search,
          },
        },
      },
      {
        evaluation: {
          code: {
            contains: query.search,
          },
        },
      },
    ];
  }

  const skip =
    (query.page - 1) * query.pageSize;

  const [
    total,
    grades,
  ] = await prisma.$transaction([
    prisma.grade.count({
      where,
    }),
    prisma.grade.findMany({
      where,
      select: gradeSelect,
      orderBy: [
        {
          evaluation: {
            sequence: 'asc',
          },
        },
        {
          enrolment: {
            student: {
              lastName1: 'asc',
            },
          },
        },
        {
          enrolment: {
            student: {
              firstName: 'asc',
            },
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

  return {
    items: grades.map(serializeGrade),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(
        1,
        Math.ceil(total / query.pageSize),
      ),
    },
  };
}

export async function getGradeById(
  gradeId: number,
) {
  const grade =
    await getGradeOrThrow(gradeId);

  return {
    grade: serializeGrade(grade),
  };
}

export async function createGrade(
  input: CreateGradeInput,
) {
  const existingGrade =
    await prisma.grade.findUnique({
      where: {
        enrolmentId_evaluationId: {
          enrolmentId: input.enrolmentId,
          evaluationId: input.evaluationId,
        },
      },
    });

  if (existingGrade) {
    throw new GradeAlreadyExistsError();
  }

  const {
    assessmentScheme,
    calculatedGrade,
  } = await validateGradeInput(input);

  const createdGrade =
    await prisma.grade.create({
      data: {
        enrolmentId: input.enrolmentId,
        evaluationId: input.evaluationId,
        assessmentSchemeId:
          assessmentScheme.id,
        gradeStatusId:
          input.gradeStatusId ?? null,
        numericGrade:
          calculatedGrade.numericGrade,
        finalGrade:
          calculatedGrade.finalGrade,
        isPassed:
          calculatedGrade.isPassed,
        remarks: input.remarks ?? null,
        componentScores: {
          create:
            calculatedGrade.componentScoreData,
        },
      },
      select: {
        id: true,
      },
    });

  return {
    message:
      'Calificación registrada correctamente.',
    grade: serializeGrade(
      await getGradeOrThrow(
        createdGrade.id,
      ),
    ),
  };
}

export async function updateGrade(
  gradeId: number,
  input: UpdateGradeInput,
) {
  const currentGrade =
    await getGradeOrThrow(gradeId);

  if (currentGrade.deletedAt !== null) {
    throw new GradeArchivedError();
  }

  if (currentGrade.isLocked) {
    throw new GradeLockedError();
  }

  const duplicateGrade =
    await prisma.grade.findFirst({
      where: {
        id: {
          not: gradeId,
        },
        enrolmentId: input.enrolmentId,
        evaluationId: input.evaluationId,
      },
    });

  if (duplicateGrade) {
    throw new GradeAlreadyExistsError();
  }

  const {
    assessmentScheme,
    calculatedGrade,
  } = await validateGradeInput(input);

  await prisma.$transaction([
    prisma.gradeComponentScore.deleteMany({
      where: {
        gradeId,
      },
    }),
    prisma.grade.update({
      where: {
        id: gradeId,
      },
      data: {
        enrolmentId: input.enrolmentId,
        evaluationId: input.evaluationId,
        assessmentSchemeId:
          assessmentScheme.id,
        gradeStatusId:
          input.gradeStatusId ?? null,
        numericGrade:
          calculatedGrade.numericGrade,
        finalGrade:
          calculatedGrade.finalGrade,
        isPassed:
          calculatedGrade.isPassed,
        remarks: input.remarks ?? null,
        componentScores: {
          create:
            calculatedGrade.componentScoreData,
        },
      },
    }),
  ]);

  return {
    message:
      'Calificación actualizada correctamente.',
    grade: serializeGrade(
      await getGradeOrThrow(gradeId),
    ),
  };
}

export async function archiveGrade(
  gradeId: number,
) {
  const grade =
    await getGradeOrThrow(gradeId);

  if (grade.deletedAt !== null) {
    throw new GradeAlreadyArchivedError();
  }

  if (
    grade.isLocked
    || evaluationBlocksChanges(
      grade.evaluation.status,
    )
  ) {
    throw new GradeLockedError();
  }

  const archivedGrade =
    await prisma.grade.update({
      where: {
        id: gradeId,
      },
      data: {
        deletedAt: new Date(),
      },
      select: gradeSelect,
    });

  return {
    message:
      'Calificación archivada correctamente.',
    grade: serializeGrade(archivedGrade),
  };
}

export async function restoreGrade(
  gradeId: number,
) {
  const grade =
    await getGradeOrThrow(gradeId);

  if (grade.deletedAt === null) {
    throw new GradeNotArchivedError();
  }

  const restoredGrade =
    await prisma.grade.update({
      where: {
        id: gradeId,
      },
      data: {
        deletedAt: null,
      },
      select: gradeSelect,
    });

  return {
    message:
      'Calificación restaurada correctamente.',
    grade: serializeGrade(restoredGrade),
  };
}
