import { z } from 'zod';

const enrolmentStatuses = [
  'ENROLLED',
  'WITHDRAWN',
  'CONVALIDATED',
  'EXEMPT',
  'PENDING',
  'COMPLETED',
] as const;

const statusFilters = [
  'all',
  ...enrolmentStatuses,
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

const requiredDateSchema = z
  .string({
    message:
      'La fecha de matrícula es obligatoria.',
  })
  .trim()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    {
      message:
        'La fecha debe tener formato AAAA-MM-DD.',
    },
  )
  .refine(
    (value) => {
      const date = new Date(
        `${value}T00:00:00.000Z`,
      );

      return (
        !Number.isNaN(date.getTime())
        && date.toISOString().startsWith(value)
      );
    },
    {
      message:
        'La fecha no es válida.',
    },
  );

const optionalDateSchema =
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
    requiredDateSchema.optional(),
  );

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

export const enrolmentIdParamsSchema = z
  .object({
    id: requiredPositiveIdSchema,
  })
  .strict();

export const listEnrolmentsQuerySchema = z
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
      .max(100, {
        message:
          'El tamaño de página no puede superar 100.',
      })
      .default(10),

    status: z
      .enum(statusFilters)
      .default('all'),

    studentId: optionalPositiveIdSchema,
    academicYearId: optionalPositiveIdSchema,
    centreId: optionalPositiveIdSchema,
    vocationalProgrammeId: optionalPositiveIdSchema,
    academicLevelId: optionalPositiveIdSchema,
    moduleId: optionalPositiveIdSchema,
  })
  .strict();

const enrolmentFields = {
  studentId:
    requiredPositiveIdSchema,

  academicYearId:
    requiredPositiveIdSchema,

  centreId:
    requiredPositiveIdSchema,

  moduleId:
    requiredPositiveIdSchema,

  status: z
    .enum(enrolmentStatuses, {
      message:
        'El estado de la matrícula no es válido.',
    })
    .default('ENROLLED'),

  enrolledAt:
    requiredDateSchema,

  cancelledAt:
    optionalDateSchema,

  remarks:
    optionalRemarksSchema,
};

export const createEnrolmentSchema = z
  .object(enrolmentFields)
  .strict();

export const updateEnrolmentSchema = z
  .object(enrolmentFields)
  .strict();

export type EnrolmentIdParams = z.infer<
  typeof enrolmentIdParamsSchema
>;

export type ListEnrolmentsQuery = z.infer<
  typeof listEnrolmentsQuerySchema
>;

export type CreateEnrolmentInput = z.infer<
  typeof createEnrolmentSchema
>;

export type UpdateEnrolmentInput = z.infer<
  typeof updateEnrolmentSchema
>;
