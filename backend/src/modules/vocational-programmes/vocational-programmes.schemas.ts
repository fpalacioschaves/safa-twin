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

const programmeCodeSchema = z
  .string({
    message:
      'El código del ciclo es obligatorio.',
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
    /^[A-Za-z0-9]+(?:[-_.][A-Za-z0-9]+)*$/,
    {
      message:
        'El código solo puede contener letras, números, puntos, guiones y guiones bajos.',
    },
  )
  .transform((value) =>
    value.toUpperCase(),
  );

const programmeAcronymSchema = z
  .string({
    message:
      'Las siglas del ciclo son obligatorias.',
  })
  .trim()
  .min(2, {
    message:
      'Las siglas deben tener al menos 2 caracteres.',
  })
  .max(20, {
    message:
      'Las siglas no pueden superar los 20 caracteres.',
  })
  .regex(
    /^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/,
    {
      message:
        'Las siglas solo pueden contener letras, números, guiones y guiones bajos.',
    },
  )
  .transform((value) =>
    value.toUpperCase(),
  );

const programmeNameSchema = z
  .string({
    message:
      'El nombre del ciclo es obligatorio.',
  })
  .trim()
  .min(3, {
    message:
      'El nombre debe tener al menos 3 caracteres.',
  })
  .max(191, {
    message:
      'El nombre no puede superar los 191 caracteres.',
  });

const programmeTypeSchema = z.enum([
  'BASIC',
  'INTERMEDIATE',
  'HIGHER',
  'SPECIALIZATION',
]);

const optionalTotalHoursSchema = z.preprocess(
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
        'Las horas totales deben ser un número entero.',
    })
    .min(1, {
      message:
        'Las horas totales deben ser mayores que cero.',
    })
    .max(10000, {
      message:
        'Las horas totales no pueden superar 10000.',
    })
    .optional(),
);

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
  z.coerce
    .number()
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

const programmeFields = {
  code: programmeCodeSchema,
  name: programmeNameSchema,
  acronym: programmeAcronymSchema,

  family: createOptionalStringSchema(
    'La familia profesional',
    150,
  ),

  type: programmeTypeSchema,

  totalHours: optionalTotalHoursSchema,

  description: createOptionalStringSchema(
    'La descripción',
    5000,
  ),
};

export const vocationalProgrammeIdParamsSchema = z
  .object({
    id: z.coerce
      .number()
      .int({
        message:
          'El identificador del ciclo debe ser un número entero.',
      })
      .positive({
        message:
          'El identificador del ciclo debe ser mayor que cero.',
      }),
  })
  .strict();

export const programmeCentreParamsSchema = z
  .object({
    id: z.coerce
      .number()
      .int({
        message:
          'El identificador del ciclo debe ser un número entero.',
      })
      .positive({
        message:
          'El identificador del ciclo debe ser mayor que cero.',
      }),

    centreId: z.coerce
      .number()
      .int({
        message:
          'El identificador del centro debe ser un número entero.',
      })
      .positive({
        message:
          'El identificador del centro debe ser mayor que cero.',
      }),
  })
  .strict();

export const listVocationalProgrammesQuerySchema = z
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

    type: z
      .enum([
        'all',
        'BASIC',
        'INTERMEDIATE',
        'HIGHER',
        'SPECIALIZATION',
      ])
      .default('all'),

    centreId: optionalPositiveIdSchema,
  })
  .strict();

export const listProgrammeCentresQuerySchema = z
  .object({
    status: z
      .enum([
        'all',
        'active',
        'inactive',
        'archived',
      ])
      .default('all'),
  })
  .strict();

export const createVocationalProgrammeSchema = z
  .object({
    ...programmeFields,

    isActive: z
      .boolean({
        message:
          'El estado activo debe ser verdadero o falso.',
      })
      .default(true),
  })
  .strict();

export const updateVocationalProgrammeSchema = z
  .object({
    ...programmeFields,

    isActive: z.boolean({
      message:
        'El estado activo debe ser verdadero o falso.',
    }),
  })
  .strict();

export type VocationalProgrammeIdParams = z.infer<
  typeof vocationalProgrammeIdParamsSchema
>;

export type ProgrammeCentreParams = z.infer<
  typeof programmeCentreParamsSchema
>;

export type ListVocationalProgrammesQuery = z.infer<
  typeof listVocationalProgrammesQuerySchema
>;

export type ListProgrammeCentresQuery = z.infer<
  typeof listProgrammeCentresQuerySchema
>;

export type CreateVocationalProgrammeInput = z.infer<
  typeof createVocationalProgrammeSchema
>;

export type UpdateVocationalProgrammeInput = z.infer<
  typeof updateVocationalProgrammeSchema
>;