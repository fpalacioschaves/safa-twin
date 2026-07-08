import { z } from 'zod';

const positiveIdSchema = z.coerce
  .number()
  .int({
    message:
      'El identificador debe ser un número entero.',
  })
  .positive({
    message:
      'El identificador debe ser mayor que cero.',
  });

const optionalPositiveIdSchema = z.preprocess(
  (value) => {
    if (
      value === ''
      || value === null
      || value === undefined
    ) {
      return undefined;
    }

    return value;
  },
  positiveIdSchema.optional(),
);

const optionalAcademicLevelNumberSchema = z.preprocess(
  (value) => {
    if (
      value === ''
      || value === null
      || value === undefined
    ) {
      return undefined;
    }

    return value;
  },
  z.coerce
    .number()
    .int({
      message:
        'El curso debe ser un número entero.',
    })
    .min(1, {
      message:
        'El curso debe ser primero o superior.',
    })
    .max(4, {
      message:
        'El curso no puede superar cuarto.',
    })
    .optional(),
);

const optionalSearchSchema = z
  .string()
  .trim()
  .max(100, {
    message:
      'La búsqueda no puede superar los 100 caracteres.',
  })
  .optional()
  .transform((value) => value || undefined);

const optionalProgrammeAcronymSchema = z
  .string()
  .trim()
  .min(1, {
    message:
      'Las siglas del ciclo no pueden estar vacías.',
  })
  .max(20, {
    message:
      'Las siglas del ciclo no pueden superar los 20 caracteres.',
  })
  .regex(/^[A-Za-z0-9]+(?:[-_.][A-Za-z0-9]+)*$/, {
    message:
      'Las siglas del ciclo solo pueden contener letras, números, puntos, guiones y guiones bajos.',
  })
  .transform((value) => value.toUpperCase())
  .optional();

const curriculumStatusSchema = z
  .enum([
    'all',
    'active',
    'inactive',
    'archived',
  ])
  .default('active');

const pageSchema = z.coerce
  .number()
  .int({
    message:
      'La página debe ser un número entero.',
  })
  .min(1, {
    message:
      'La página debe ser mayor o igual que 1.',
  })
  .default(1);

const pageSizeSchema = z.coerce
  .number()
  .int({
    message:
      'El tamaño de página debe ser un número entero.',
  })
  .min(1, {
    message:
      'El tamaño de página debe ser mayor que cero.',
  })
  .max(100, {
    message:
      'El tamaño de página no puede superar 100.',
  })
  .default(20);

export const curriculumListQuerySchema = z
  .object({
    search: optionalSearchSchema,
    page: pageSchema,
    pageSize: pageSizeSchema,
    status: curriculumStatusSchema,
    moduleId: optionalPositiveIdSchema,
    learningOutcomeId: optionalPositiveIdSchema,
    vocationalProgrammeAcronym:
      optionalProgrammeAcronymSchema,
    academicLevelNumber:
      optionalAcademicLevelNumberSchema,
  })
  .strict();

const importCodeSchema = z
  .string({
    message:
      'El código es obligatorio.',
  })
  .trim()
  .min(1, {
    message:
      'El código no puede estar vacío.',
  })
  .max(50, {
    message:
      'El código no puede superar los 50 caracteres.',
  });

const importTitleSchema = z
  .string({
    message:
      'El título es obligatorio.',
  })
  .trim()
  .min(3, {
    message:
      'El título debe tener al menos 3 caracteres.',
  })
  .max(255, {
    message:
      'El título no puede superar los 255 caracteres.',
  });

const optionalLongTextSchema = z.preprocess(
  (value) => {
    if (
      value === null
      || value === undefined
      || (
        typeof value === 'string'
        && value.trim() === ''
      )
    ) {
      return undefined;
    }

    return value;
  },
  z
    .string({
      message:
        'La descripción debe ser una cadena de texto.',
    })
    .trim()
    .max(10000, {
      message:
        'La descripción no puede superar los 10000 caracteres.',
    })
    .optional(),
);

const optionalSourceReferenceSchema = z.preprocess(
  (value) => {
    if (
      value === null
      || value === undefined
      || (
        typeof value === 'string'
        && value.trim() === ''
      )
    ) {
      return undefined;
    }

    return value;
  },
  z
    .string({
      message:
        'La referencia de origen debe ser una cadena de texto.',
    })
    .trim()
    .max(255, {
      message:
        'La referencia de origen no puede superar los 255 caracteres.',
    })
    .optional(),
);

const sortOrderSchema = z.coerce
  .number()
  .int({
    message:
      'El orden debe ser un número entero.',
  })
  .min(0, {
    message:
      'El orden no puede ser negativo.',
  })
  .max(9999, {
    message:
      'El orden no puede superar 9999.',
  })
  .default(0);

const moduleLocatorSchema = z
  .object({
    moduleCode: importCodeSchema,
    vocationalProgrammeAcronym:
      optionalProgrammeAcronymSchema,
    academicLevelNumber:
      optionalAcademicLevelNumberSchema,
  })
  .strict();

const learningOutcomeImportSchema = moduleLocatorSchema
  .extend({
    code: importCodeSchema,
    title: importTitleSchema,
    description: optionalLongTextSchema,
    sourceReference:
      optionalSourceReferenceSchema,
    sortOrder: sortOrderSchema,
    isActive: z
      .boolean({
        message:
          'El estado activo debe ser verdadero o falso.',
      })
      .default(true),
  })
  .strict();

const trainingActionImportSchema = moduleLocatorSchema
  .extend({
    code: importCodeSchema,
    title: importTitleSchema,
    description: optionalLongTextSchema,
    plannedHours: z.preprocess(
      (value) => {
        if (
          value === ''
          || value === null
          || value === undefined
        ) {
          return undefined;
        }

        return value;
      },
      z.coerce
        .number({
          message:
            'Las horas previstas deben ser un número.',
        })
        .positive({
          message:
            'Las horas previstas deben ser mayores que cero.',
        })
        .max(9999.99, {
          message:
            'Las horas previstas no pueden superar 9999,99.',
        })
        .optional(),
    ),
    sourceReference:
      optionalSourceReferenceSchema,
    sortOrder: sortOrderSchema,
    isActive: z
      .boolean({
        message:
          'El estado activo debe ser verdadero o falso.',
      })
      .default(true),
    relatedLearningOutcomeCodes: z
      .array(importCodeSchema)
      .default([]),
  })
  .strict();

const evaluationCriterionImportSchema = moduleLocatorSchema
  .extend({
    learningOutcomeCode: importCodeSchema,
    code: importCodeSchema,
    title: importTitleSchema,
    description: optionalLongTextSchema,
    sourceReference:
      optionalSourceReferenceSchema,
    sortOrder: sortOrderSchema,
    isActive: z
      .boolean({
        message:
          'El estado activo debe ser verdadero o falso.',
      })
      .default(true),
  })
  .strict();

export const curriculumImportSchema = z
  .object({
    sourceName: optionalSourceReferenceSchema,
    sourceUrl: optionalSourceReferenceSchema,
    learningOutcomes: z
      .array(learningOutcomeImportSchema)
      .default([]),
    evaluationCriteria: z
      .array(evaluationCriterionImportSchema)
      .default([]),
    trainingActions: z
      .array(trainingActionImportSchema)
      .default([]),
  })
  .strict()
  .refine(
    (value) => (
      value.learningOutcomes.length > 0
      || value.evaluationCriteria.length > 0
      || value.trainingActions.length > 0
    ),
    {
      message:
        'La importación debe incluir al menos un resultado de aprendizaje, un criterio de evaluación o una acción formativa.',
      path: ['learningOutcomes'],
    },
  );

export type CurriculumListQuery = z.infer<
  typeof curriculumListQuerySchema
>;

export type CurriculumImportInput = z.infer<
  typeof curriculumImportSchema
>;
