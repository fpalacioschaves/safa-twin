import { z } from 'zod';

const statusFilters = [
  'all',
  'active',
  'archived',
] as const;

const optionalPositiveIdSchema =
  z.preprocess(
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
          'El identificador debe ser numérico.',
      })
      .int({
        message:
          'El identificador debe ser un número entero.',
      })
      .positive({
        message:
          'El identificador debe ser mayor que cero.',
      })
      .optional(),
  );

const requiredPositiveIdSchema =
  z.coerce
    .number({
      message:
        'El identificador debe ser numérico.',
    })
    .int({
      message:
        'El identificador debe ser un número entero.',
    })
    .positive({
      message:
        'El identificador debe ser mayor que cero.',
    });

const optionalRemarksSchema =
  z.preprocess(
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
          'Las observaciones deben ser texto.',
      })
      .trim()
      .max(5000, {
        message:
          'Las observaciones no pueden superar los 5000 caracteres.',
      })
      .optional(),
  );

const optionalScoreSchema =
  z.preprocess(
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
          'La nota debe ser numérica.',
      })
      .min(0, {
        message:
          'La nota no puede ser menor que 0.',
      })
      .max(10, {
        message:
          'La nota no puede ser mayor que 10.',
      })
      .refine(
        (value) =>
          Number.isFinite(value)
          && Number.isInteger(
            Math.round(value * 100),
          ),
        {
          message:
            'La nota debe tener como máximo dos decimales.',
        },
      )
      .optional(),
  );

export const gradeIdParamsSchema = z
  .object({
    id: requiredPositiveIdSchema,
  })
  .strict();

export const listGradesQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(100, {
        message:
          'La búsqueda no puede superar los 100 caracteres.',
      })
      .optional()
      .transform(
        (value) => value || undefined,
      ),

    page: z.coerce
      .number()
      .int({
        message:
          'La página debe ser un número entero.',
      })
      .min(1, {
        message:
          'La página debe ser mayor o igual que 1.',
      })
      .default(1),

    pageSize: z.coerce
      .number()
      .int({
        message:
          'El tamaño de página debe ser un número entero.',
      })
      .min(1, {
        message:
          'El tamaño de página debe ser mayor que cero.',
      })
      .max(50, {
        message:
          'El tamaño de página no puede superar 50.',
      })
      .default(10),

    status: z
      .enum(statusFilters)
      .default('active'),

    enrolmentId: optionalPositiveIdSchema,
    evaluationId: optionalPositiveIdSchema,
    academicYearId: optionalPositiveIdSchema,
    centreId: optionalPositiveIdSchema,
    moduleId: optionalPositiveIdSchema,
  })
  .strict();

const gradeComponentScoreInputSchema = z
  .object({
    assessmentComponentId:
      requiredPositiveIdSchema,

    score: optionalScoreSchema,

    isMissing: z
      .boolean({
        message:
          'El indicador de componente no presentado debe ser verdadero o falso.',
      })
      .default(false),

    remarks: optionalRemarksSchema,
  })
  .strict();

export const createGradeSchema = z
  .object({
    enrolmentId: requiredPositiveIdSchema,
    evaluationId: requiredPositiveIdSchema,
    assessmentSchemeId:
      optionalPositiveIdSchema,
    gradeStatusId: optionalPositiveIdSchema,
    remarks: optionalRemarksSchema,

    componentScores: z
      .array(
        gradeComponentScoreInputSchema,
      )
      .default([]),
  })
  .strict();

export const updateGradeSchema =
  createGradeSchema;

export type GradeIdParams = z.infer<
  typeof gradeIdParamsSchema
>;

export type ListGradesQuery = z.infer<
  typeof listGradesQuerySchema
>;

export type CreateGradeInput = z.infer<
  typeof createGradeSchema
>;

export type UpdateGradeInput = z.infer<
  typeof updateGradeSchema
>;
