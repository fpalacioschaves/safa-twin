import type {
  Prisma,
} from '../../generated/prisma/client.js';

import { prisma } from '../../config/database.js';

import type {
  AcademicStatisticsQuery,
} from './statistics.schemas.js';

const gradeBucketDefinitions = [
  {
    key: '0-4.99',
    label: 'Suspenso',
    min: 0,
    max: 4.99,
  },
  {
    key: '5-5.99',
    label: 'Aprobado',
    min: 5,
    max: 5.99,
  },
  {
    key: '6-6.99',
    label: 'Bien',
    min: 6,
    max: 6.99,
  },
  {
    key: '7-7.99',
    label: 'Notable bajo',
    min: 7,
    max: 7.99,
  },
  {
    key: '8-8.99',
    label: 'Notable alto',
    min: 8,
    max: 8.99,
  },
  {
    key: '9-10',
    label: 'Sobresaliente',
    min: 9,
    max: 10,
  },
] as const;

const enrolmentInclude = {
  academicYear: {
    select: {
      id: true,
      name: true,
      isCurrent: true,
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
  module: {
    include: {
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
} satisfies Prisma.EnrolmentInclude;

const gradeInclude = {
  gradeStatus: true,
  evaluation: {
    select: {
      id: true,
      code: true,
      name: true,
      sequence: true,
      status: true,
    },
  },
  enrolment: {
    include: enrolmentInclude,
  },
} satisfies Prisma.GradeInclude;

type EnrolmentWithRelations =
  Prisma.EnrolmentGetPayload<{
    include: typeof enrolmentInclude;
  }>;

type GradeWithRelations =
  Prisma.GradeGetPayload<{
    include: typeof gradeInclude;
  }>;

type StatusDistributionItem = {
  code: string;
  name: string;
  count: number;
  isEvaluable: boolean | null;
  countsAsPassed: boolean | null;
  countsAsNoShow: boolean | null;
};

type GradeBucketItem = {
  key: string;
  label: string;
  min: number;
  max: number;
  count: number;
};

type StatisticsCounters = {
  enrolled: number;
  gradeRecords: number;
  numericEvaluated: number;
  statusPassed: number;
  passed: number;
  failed: number;
  noShow: number;
  nonEvaluable: number;
  numericGradeSum: number;
  numericGradeMin: number | null;
  numericGradeMax: number | null;
  statusDistribution: Map<
    string,
    StatusDistributionItem
  >;
  gradeBuckets: Map<string, GradeBucketItem>;
};

type SerializedStatisticsCounters = {
  enrolled: number;
  gradeRecords: number;
  evaluated: number;
  numericEvaluated: number;
  statusPassed: number;
  passed: number;
  failed: number;
  notEvaluated: number | null;
  noShow: number;
  nonEvaluable: number;
  averageGrade: number | null;
  minGrade: number | null;
  maxGrade: number | null;
  successRate: number | null;
  performanceRate: number | null;
  coverageRate: number | null;
  statusDistribution: StatusDistributionItem[];
  gradeDistribution: GradeBucketItem[];
};

type GroupedStatisticsItem = {
  id: number;
  code: string;
  name: string;
  acronym?: string | null;
  sortOrder?: number;
  metrics: SerializedStatisticsCounters;
};

function createCounters(): StatisticsCounters {
  return {
    enrolled: 0,
    gradeRecords: 0,
    numericEvaluated: 0,
    statusPassed: 0,
    passed: 0,
    failed: 0,
    noShow: 0,
    nonEvaluable: 0,
    numericGradeSum: 0,
    numericGradeMin: null,
    numericGradeMax: null,
    statusDistribution: new Map(),
    gradeBuckets: new Map(
      gradeBucketDefinitions.map((bucket) => [
        bucket.key,
        {
          key: bucket.key,
          label: bucket.label,
          min: bucket.min,
          max: bucket.max,
          count: 0,
        },
      ]),
    ),
  };
}

function roundToTwoDecimals(
  value: number,
): number {
  return Math.round(value * 100) / 100;
}

function getRate(
  numerator: number,
  denominator: number,
): number | null {
  if (denominator <= 0) {
    return null;
  }

  return roundToTwoDecimals(
    numerator * 100 / denominator,
  );
}

function getGradeBucketKey(
  grade: number,
): string {
  const bucket =
    gradeBucketDefinitions.find(
      (definition) =>
        grade >= definition.min
        && grade <= definition.max,
    );

  return bucket?.key ?? '0-4.99';
}

function addEnrolment(
  counters: StatisticsCounters,
): void {
  counters.enrolled += 1;
}

function addGradeStatus(
  counters: StatisticsCounters,
  grade: GradeWithRelations,
): void {
  const status = grade.gradeStatus;

  const code =
    status?.code ?? 'SIN_ESTADO';

  const existing =
    counters.statusDistribution.get(code);

  if (existing) {
    existing.count += 1;
    return;
  }

  counters.statusDistribution.set(
    code,
    {
      code,
      name: status?.name ?? 'Sin estado',
      count: 1,
      isEvaluable:
        status?.isEvaluable ?? null,
      countsAsPassed:
        status?.countsAsPassed ?? null,
      countsAsNoShow:
        status?.countsAsNoShow ?? null,
    },
  );
}

function addNumericGrade(
  counters: StatisticsCounters,
  finalGrade: number,
): void {
  counters.numericEvaluated += 1;
  counters.numericGradeSum += finalGrade;

  counters.numericGradeMin =
    counters.numericGradeMin === null
      ? finalGrade
      : Math.min(
        counters.numericGradeMin,
        finalGrade,
      );

  counters.numericGradeMax =
    counters.numericGradeMax === null
      ? finalGrade
      : Math.max(
        counters.numericGradeMax,
        finalGrade,
      );

  const bucketKey =
    getGradeBucketKey(finalGrade);

  const bucket =
    counters.gradeBuckets.get(bucketKey);

  if (bucket) {
    bucket.count += 1;
  }
}

function addGrade(
  counters: StatisticsCounters,
  grade: GradeWithRelations,
): void {
  counters.gradeRecords += 1;

  addGradeStatus(
    counters,
    grade,
  );

  const finalGrade =
    grade.finalGrade === null
      ? null
      : Number(grade.finalGrade);

  if (grade.gradeStatus?.countsAsNoShow) {
    counters.noShow += 1;
  }

  if (
    grade.gradeStatus
    && !grade.gradeStatus.isEvaluable
  ) {
    counters.nonEvaluable += 1;
  }

  if (finalGrade !== null) {
    addNumericGrade(
      counters,
      finalGrade,
    );

    if (finalGrade >= 5) {
      counters.passed += 1;
    } else {
      counters.failed += 1;
    }

    return;
  }

  if (grade.gradeStatus?.countsAsPassed) {
    counters.statusPassed += 1;
    counters.passed += 1;
  }
}

function serializeCounters(
  counters: StatisticsCounters,
  hasEvaluationScope: boolean,
): SerializedStatisticsCounters {
  const evaluated =
    counters.numericEvaluated
    + counters.statusPassed;

  const notEvaluated =
    hasEvaluationScope
      ? Math.max(
        0,
        counters.enrolled - evaluated,
      )
      : null;

  const averageGrade =
    counters.numericEvaluated > 0
      ? roundToTwoDecimals(
        counters.numericGradeSum
        / counters.numericEvaluated,
      )
      : null;

  return {
    enrolled: counters.enrolled,
    gradeRecords: counters.gradeRecords,
    evaluated,
    numericEvaluated:
      counters.numericEvaluated,
    statusPassed: counters.statusPassed,
    passed: counters.passed,
    failed: counters.failed,
    notEvaluated,
    noShow: counters.noShow,
    nonEvaluable: counters.nonEvaluable,
    averageGrade,
    minGrade: counters.numericGradeMin,
    maxGrade: counters.numericGradeMax,
    successRate: getRate(
      counters.passed,
      evaluated,
    ),
    performanceRate:
      hasEvaluationScope
        ? getRate(
          counters.passed,
          counters.enrolled,
        )
        : null,
    coverageRate:
      hasEvaluationScope
        ? getRate(
          counters.gradeRecords,
          counters.enrolled,
        )
        : null,
    statusDistribution:
      Array
        .from(
          counters.statusDistribution.values(),
        )
        .sort(
          (left, right) =>
            right.count - left.count
            || left.code.localeCompare(
              right.code,
              'es',
            ),
        ),
    gradeDistribution:
      Array.from(
        counters.gradeBuckets.values(),
      ),
  };
}

function buildModuleWhere(
  query: AcademicStatisticsQuery,
): Prisma.ModuleWhereInput | undefined {
  const moduleWhere:
  Prisma.ModuleWhereInput = {};

  if (query.moduleId) {
    moduleWhere.id = query.moduleId;
  }

  if (query.vocationalProgrammeId) {
    moduleWhere.vocationalProgrammeId =
      query.vocationalProgrammeId;
  }

  if (query.academicLevelId) {
    moduleWhere.academicLevelId =
      query.academicLevelId;
  }

  if (
    Object.keys(moduleWhere).length === 0
  ) {
    return undefined;
  }

  return moduleWhere;
}

function buildEnrolmentWhere(
  query: AcademicStatisticsQuery,
): Prisma.EnrolmentWhereInput {
  const where:
  Prisma.EnrolmentWhereInput = {
    deletedAt: null,
    cancelledAt: null,
    NOT: {
      status: 'WITHDRAWN',
    },
  };

  if (query.academicYearId) {
    where.academicYearId =
      query.academicYearId;
  }

  if (query.centreId) {
    where.centreId =
      query.centreId;
  }

  const moduleWhere =
    buildModuleWhere(query);

  if (moduleWhere) {
    where.module = {
      is: moduleWhere,
    };
  }

  return where;
}

function buildGradeWhere(
  query: AcademicStatisticsQuery,
  enrolmentWhere:
  Prisma.EnrolmentWhereInput,
): Prisma.GradeWhereInput {
  const where:
  Prisma.GradeWhereInput = {
    deletedAt: null,
    enrolment: {
      is: enrolmentWhere,
    },
    evaluation: {
      is: {
        deletedAt: null,
      },
    },
  };

  if (query.evaluationId) {
    where.evaluationId =
      query.evaluationId;
  }

  return where;
}

function getProgrammeKey(
  enrolment: EnrolmentWithRelations,
): string {
  return String(
    enrolment.module.vocationalProgramme.id,
  );
}

function getLevelKey(
  enrolment: EnrolmentWithRelations,
): string {
  return String(
    enrolment.module.academicLevel.id,
  );
}

function getModuleKey(
  enrolment: EnrolmentWithRelations,
): string {
  return String(enrolment.module.id);
}

function ensureProgrammeGroup(
  groups: Map<string, {
    id: number;
    code: string;
    name: string;
    acronym: string | null;
    counters: StatisticsCounters;
  }>,
  enrolment: EnrolmentWithRelations,
) {
  const key = getProgrammeKey(enrolment);
  const existing = groups.get(key);

  if (existing) {
    return existing;
  }

  const created = {
    id: enrolment.module.vocationalProgramme.id,
    code:
      enrolment.module.vocationalProgramme.code,
    name:
      enrolment.module.vocationalProgramme.name,
    acronym:
      enrolment.module.vocationalProgramme
        .acronym,
    counters: createCounters(),
  };

  groups.set(
    key,
    created,
  );

  return created;
}

function ensureLevelGroup(
  groups: Map<string, {
    id: number;
    code: string;
    name: string;
    sortOrder: number;
    counters: StatisticsCounters;
  }>,
  enrolment: EnrolmentWithRelations,
) {
  const key = getLevelKey(enrolment);
  const existing = groups.get(key);

  if (existing) {
    return existing;
  }

  const created = {
    id: enrolment.module.academicLevel.id,
    code:
      String(
        enrolment.module.academicLevel.number,
      ),
    name: enrolment.module.academicLevel.name,
    sortOrder:
      enrolment.module.academicLevel.number,
    counters: createCounters(),
  };

  groups.set(
    key,
    created,
  );

  return created;
}

function ensureModuleGroup(
  groups: Map<string, {
    id: number;
    code: string;
    name: string;
    sortOrder: number;
    acronym: string | null;
    counters: StatisticsCounters;
  }>,
  enrolment: EnrolmentWithRelations,
) {
  const key = getModuleKey(enrolment);
  const existing = groups.get(key);

  if (existing) {
    return existing;
  }

  const created = {
    id: enrolment.module.id,
    code: enrolment.module.code,
    name: enrolment.module.name,
    sortOrder: enrolment.module.sortOrder,
    acronym: enrolment.module.acronym,
    counters: createCounters(),
  };

  groups.set(
    key,
    created,
  );

  return created;
}

function serializeProgrammeGroups(
  groups: Map<string, {
    id: number;
    code: string;
    name: string;
    acronym: string | null;
    counters: StatisticsCounters;
  }>,
  hasEvaluationScope: boolean,
): GroupedStatisticsItem[] {
  return Array
    .from(groups.values())
    .map((group) => ({
      id: group.id,
      code: group.code,
      name: group.name,
      acronym: group.acronym,
      metrics: serializeCounters(
        group.counters,
        hasEvaluationScope,
      ),
    }))
    .sort(
      (left, right) =>
        (left.acronym ?? left.name)
          .localeCompare(
            right.acronym ?? right.name,
            'es',
          ),
    );
}

function serializeLevelGroups(
  groups: Map<string, {
    id: number;
    code: string;
    name: string;
    sortOrder: number;
    counters: StatisticsCounters;
  }>,
  hasEvaluationScope: boolean,
): GroupedStatisticsItem[] {
  return Array
    .from(groups.values())
    .map((group) => ({
      id: group.id,
      code: group.code,
      name: group.name,
      sortOrder: group.sortOrder,
      metrics: serializeCounters(
        group.counters,
        hasEvaluationScope,
      ),
    }))
    .sort(
      (left, right) =>
        (left.sortOrder ?? 0)
        - (right.sortOrder ?? 0),
    );
}

function serializeModuleGroups(
  groups: Map<string, {
    id: number;
    code: string;
    name: string;
    sortOrder: number;
    acronym: string | null;
    counters: StatisticsCounters;
  }>,
  hasEvaluationScope: boolean,
): GroupedStatisticsItem[] {
  return Array
    .from(groups.values())
    .map((group) => ({
      id: group.id,
      code: group.code,
      name: group.name,
      acronym: group.acronym,
      sortOrder: group.sortOrder,
      metrics: serializeCounters(
        group.counters,
        hasEvaluationScope,
      ),
    }))
    .sort(
      (left, right) =>
        (left.sortOrder ?? 0)
        - (right.sortOrder ?? 0)
        || left.name.localeCompare(
          right.name,
          'es',
        ),
    );
}

function getWarnings(
  query: AcademicStatisticsQuery,
): string[] {
  const warnings: string[] = [];

  if (!query.evaluationId) {
    warnings.push(
      'No se ha filtrado por evaluación. Las tasas de rendimiento, cobertura y no evaluados se devuelven como nulas para evitar mezclar varias evaluaciones.',
    );
  }

  if (!query.academicYearId) {
    warnings.push(
      'No se ha filtrado por curso académico. Los resultados pueden mezclar matrículas de distintos cursos.',
    );
  }

  return warnings;
}

export async function getAcademicStatistics(
  query: AcademicStatisticsQuery,
) {
  const enrolmentWhere =
    buildEnrolmentWhere(query);

  const gradeWhere =
    buildGradeWhere(
      query,
      enrolmentWhere,
    );

  const [
    enrolments,
    grades,
  ] = await prisma.$transaction([
    prisma.enrolment.findMany({
      where: enrolmentWhere,
      include: enrolmentInclude,
      orderBy: [
        {
          module: {
            vocationalProgramme: {
              acronym: 'asc',
            },
          },
        },
        {
          module: {
            academicLevel: {
              number: 'asc',
            },
          },
        },
        {
          module: {
            sortOrder: 'asc',
          },
        },
      ],
    }),
    prisma.grade.findMany({
      where: gradeWhere,
      include: gradeInclude,
      orderBy: [
        {
          evaluation: {
            sequence: 'asc',
          },
        },
        {
          enrolment: {
            module: {
              sortOrder: 'asc',
            },
          },
        },
      ],
    }),
  ]);

  const hasEvaluationScope =
    Boolean(query.evaluationId);

  const summaryCounters =
    createCounters();

  const programmeGroups =
    new Map<string, {
      id: number;
      code: string;
      name: string;
      acronym: string | null;
      counters: StatisticsCounters;
    }>();

  const levelGroups =
    new Map<string, {
      id: number;
      code: string;
      name: string;
      sortOrder: number;
      counters: StatisticsCounters;
    }>();

  const moduleGroups =
    new Map<string, {
      id: number;
      code: string;
      name: string;
      sortOrder: number;
      acronym: string | null;
      counters: StatisticsCounters;
    }>();

  for (const enrolment of enrolments) {
    addEnrolment(summaryCounters);

    addEnrolment(
      ensureProgrammeGroup(
        programmeGroups,
        enrolment,
      ).counters,
    );

    addEnrolment(
      ensureLevelGroup(
        levelGroups,
        enrolment,
      ).counters,
    );

    addEnrolment(
      ensureModuleGroup(
        moduleGroups,
        enrolment,
      ).counters,
    );
  }

  for (const grade of grades) {
    addGrade(
      summaryCounters,
      grade,
    );

    addGrade(
      ensureProgrammeGroup(
        programmeGroups,
        grade.enrolment,
      ).counters,
      grade,
    );

    addGrade(
      ensureLevelGroup(
        levelGroups,
        grade.enrolment,
      ).counters,
      grade,
    );

    addGrade(
      ensureModuleGroup(
        moduleGroups,
        grade.enrolment,
      ).counters,
      grade,
    );
  }

  return {
    filters: query,
    warnings: getWarnings(query),
    summary: serializeCounters(
      summaryCounters,
      hasEvaluationScope,
    ),
    byProgramme: serializeProgrammeGroups(
      programmeGroups,
      hasEvaluationScope,
    ),
    byLevel: serializeLevelGroups(
      levelGroups,
      hasEvaluationScope,
    ),
    byModule: serializeModuleGroups(
      moduleGroups,
      hasEvaluationScope,
    ),
  };
}
