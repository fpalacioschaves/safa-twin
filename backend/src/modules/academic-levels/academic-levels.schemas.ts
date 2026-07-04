import { z } from 'zod';

function createOptionalStringSchema(
  fieldName: string,
  maximumLength: number,
) {
  return z.preprocess(
    (value) => {
      if (
        typeof value === 'string'
        && value.trim() === ''
      ) {
        return undefined;
      }

      return value;
    },
    z
      .string({
        message:
          `${fieldName} debe ser una cadena de texto.`,
      })
      .trim()
      .max(maximumLength, {
        message:
          `${fieldName} no puede superar los ${maximumLength} caracteres.`,
      })
      .optional(),
  );
}

const academicLevelNumberSchema = z.coerce
  .number({
    message:
      'El número del nivel es obligatorio.',
  })
  .int({
    message:
      'El número del nivel debe ser un número entero.',
  })
  .min(1, {
    message:
      'El número del nivel debe ser mayor o igual que 1.',
  })
  .max(99, {
    message:
      'El número del nivel no puede superar 99.',
  });

const academicLevelNameSchema = z
  .string({
    message:
      'El nombre del nivel es obligatorio.',
  })
  .trim()
  .min(2, {
    message:
      'El nombre debe tener al menos 2 caracteres.',
  })
  .max(50, {
    message:
      'El nombre no puede superar los 50 caracteres.',
  });

const optionalLevelNumberSchema = z.preprocess(
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
  academicLevelNumberSchema.optional(),
);

const academicLevelFields = {
  number: academicLevelNumberSchema,
  name: academicLevelNameSchema,

  description: createOptionalStringSchema(
    'La descripción',
    255,
  ),
};

export const academicLevelIdParamsSchema = z
  .object({
    id: z.coerce
      .number()
      .int({
        message:
          'El identificador del nivel debe ser un número entero.',
      })
      .positive({
        message:
          'El identificador del nivel debe ser mayor que cero.',
      }),
  })
  .strict();

export const listAcademicLevelsQuerySchema = z
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
      .enum([
        'all',
        'active',
        'inactive',
        'archived',
      ])
      .default('all'),

    number: optionalLevelNumberSchema,
  })
  .strict();

export const createAcademicLevelSchema = z
  .object({
    ...academicLevelFields,

    isActive: z
      .boolean({
        message:
          'El estado activo debe ser verdadero o falso.',
      })
      .default(true),
  })
  .strict();

export const updateAcademicLevelSchema = z
  .object({
    ...academicLevelFields,

    isActive: z.boolean({
      message:
        'El estado activo debe ser verdadero o falso.',
    }),
  })
  .strict();

export type AcademicLevelIdParams = z.infer<
  typeof academicLevelIdParamsSchema
>;

export type ListAcademicLevelsQuery = z.infer<
  typeof listAcademicLevelsQuerySchema
>;

export type CreateAcademicLevelInput = z.infer<
  typeof createAcademicLevelSchema
>;

export type UpdateAcademicLevelInput = z.infer<
  typeof updateAcademicLevelSchema
>;