import { z } from 'zod';

const statusFilters = [
  'all',
  'active',
  'inactive',
  'archived',
] as const;

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

export const gradeStatusIdParamsSchema = z
  .object({
    id: requiredPositiveIdSchema,
  })
  .strict();

export const listGradeStatusesQuerySchema = z
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
      .default(50),

    status: z
      .enum(statusFilters)
      .default('all'),
  })
  .strict();

const optionalDescriptionSchema =
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
          'La descripción debe ser texto.',
      })
      .trim()
      .max(255, {
        message:
          'La descripción no puede superar los 255 caracteres.',
      })
      .optional(),
  );

const gradeStatusFields = {
  code: z
    .string({
      message:
        'El código es obligatorio.',
    })
    .trim()
    .min(1, {
      message:
        'El código es obligatorio.',
    })
    .max(30, {
      message:
        'El código no puede superar los 30 caracteres.',
    })
    .regex(
      /^[A-Za-z0-9_\-]+$/,
      {
        message:
          'El código solo puede contener letras, números, guiones y guiones bajos.',
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
    .max(100, {
      message:
        'El nombre no puede superar los 100 caracteres.',
    }),

  description: optionalDescriptionSchema,

  isEvaluable: z.boolean().default(false),
  countsAsPassed: z.boolean().default(false),
  countsAsNoShow: z.boolean().default(false),

  sortOrder: z.coerce
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

  isActive: z.boolean().default(true),
};

export const createGradeStatusSchema = z
  .object(gradeStatusFields)
  .strict();

export const updateGradeStatusSchema = z
  .object(gradeStatusFields)
  .strict();

export type CreateGradeStatusInput =
  z.infer<typeof createGradeStatusSchema>;

export type UpdateGradeStatusInput =
  z.infer<typeof updateGradeStatusSchema>;

export type ListGradeStatusesQuery =
  z.infer<typeof listGradeStatusesQuerySchema>;
