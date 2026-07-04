import { z } from 'zod';

const evaluationStatuses = [
  'DRAFT',
  'OPEN',
  'CLOSED',
  'LOCKED',
] as const;

const statusFilters = [
  'all',
  ...evaluationStatuses,
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

const requiredDateSchema = z
  .string({
    message:
      'La fecha es obligatoria.',
  })
  .trim()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    {
      message:
        'La fecha debe tener formato AAAA-MM-DD.',
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

export const evaluationIdParamsSchema = z
  .object({
    id: requiredPositiveIdSchema,
  })
  .strict();

export const listEvaluationsQuerySchema = z
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
      .default('all'),

    academicYearId: optionalPositiveIdSchema,
    centreId: optionalPositiveIdSchema,
  })
  .strict();

const evaluationFields = {
  academicYearId:
    requiredPositiveIdSchema,

  centreId:
    requiredPositiveIdSchema,

  code: z
    .string({
      message:
        'El código es obligatorio.',
    })
    .trim()
    .min(2, {
      message:
        'El código debe tener al menos 2 caracteres.',
    })
    .max(50, {
      message:
        'El código no puede superar los 50 caracteres.',
    })
    .regex(
      /^[A-Za-z0-9]+(?:[-_./][A-Za-z0-9]+)*$/,
      {
        message:
          'El código solo puede contener letras, números, puntos, barras, guiones y guiones bajos.',
      },
    ),

  name: z
    .string({
      message:
        'El nombre es obligatorio.',
    })
    .trim()
    .min(2, {
      message:
        'El nombre debe tener al menos 2 caracteres.',
    })
    .max(150, {
      message:
        'El nombre no puede superar los 150 caracteres.',
    }),

  sequence: z.coerce
    .number()
    .int({
      message:
        'El orden debe ser un número entero.',
    })
    .min(0, {
      message:
        'El orden no puede ser negativo.',
    })
    .default(0),

  startsAt: optionalDateSchema,
  endsAt: optionalDateSchema,

  status: z
    .enum(evaluationStatuses, {
      message:
        'El estado de la evaluación no es válido.',
    })
    .default('DRAFT'),

  remarks: optionalRemarksSchema,
};

function validateEvaluationDates(
  value: {
    startsAt?: string;
    endsAt?: string;
  },
): boolean {
  if (!value.startsAt || !value.endsAt) {
    return true;
  }

  return value.startsAt <= value.endsAt;
}

export const createEvaluationSchema = z
  .object(evaluationFields)
  .strict()
  .refine(
    validateEvaluationDates,
    {
      message:
        'La fecha de inicio no puede ser posterior a la fecha de fin.',
      path: ['endsAt'],
    },
  );

export const updateEvaluationSchema = z
  .object(evaluationFields)
  .strict()
  .refine(
    validateEvaluationDates,
    {
      message:
        'La fecha de inicio no puede ser posterior a la fecha de fin.',
      path: ['endsAt'],
    },
  );

export type CreateEvaluationInput =
  z.infer<typeof createEvaluationSchema>;

export type UpdateEvaluationInput =
  z.infer<typeof updateEvaluationSchema>;

export type ListEvaluationsQuery =
  z.infer<typeof listEvaluationsQuerySchema>;
