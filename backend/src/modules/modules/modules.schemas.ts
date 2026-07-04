import { z } from 'zod';

function createOptionalStringSchema(
  fieldName: string,
  maximumLength: number,
) {
  return z.preprocess(
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

function createOptionalIntegerSchema(
  fieldName: string,
  maximumValue: number,
) {
  return z.preprocess(
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
          `${fieldName} debe ser un número entero.`,
      })
      .min(1, {
        message:
          `${fieldName} debe ser mayor que cero.`,
      })
      .max(maximumValue, {
        message:
          `${fieldName} no puede superar ${maximumValue}.`,
      })
      .optional(),
  );
}

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

const moduleCodeSchema = z
  .string({
    message:
      'El código del módulo es obligatorio.',
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
  )
  .transform((value) =>
    value.toUpperCase(),
  );

const moduleNameSchema = z
  .string({
    message:
      'El nombre del módulo es obligatorio.',
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

const optionalAcronymSchema = z.preprocess(
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
        'Las siglas deben ser una cadena de texto.',
    })
    .trim()
    .min(1, {
      message:
        'Las siglas no pueden estar vacías.',
    })
    .max(30, {
      message:
        'Las siglas no pueden superar los 30 caracteres.',
    })
    .regex(
      /^[A-Za-z0-9]+(?:[-_.][A-Za-z0-9]+)*$/,
      {
        message:
          'Las siglas solo pueden contener letras, números, puntos, guiones y guiones bajos.',
      },
    )
    .transform((value) =>
      value.toUpperCase(),
    )
    .optional(),
);

const optionalWeeklyHoursSchema = z.preprocess(
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
        'Las horas semanales deben ser un número.',
    })
    .positive({
      message:
        'Las horas semanales deben ser mayores que cero.',
    })
    .max(99.99, {
      message:
        'Las horas semanales no pueden superar 99,99.',
    })
    .refine(
      (value) => (
        Math.abs(
          value * 100
          - Math.round(value * 100),
        ) < 0.000001
      ),
      {
        message:
          'Las horas semanales no pueden tener más de dos decimales.',
      },
    )
    .optional(),
);

const sortOrderSchema = z.coerce
  .number({
    message:
      'El orden debe ser un número.',
  })
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
  });

const moduleFields = {
  vocationalProgrammeId:
    positiveIdSchema,

  academicLevelId:
    positiveIdSchema,

  code:
    moduleCodeSchema,

  name:
    moduleNameSchema,

  acronym:
    optionalAcronymSchema,

  totalHours:
    createOptionalIntegerSchema(
      'Las horas totales',
      10000,
    ),

  weeklyHours:
    optionalWeeklyHoursSchema,

  sortOrder:
    sortOrderSchema,
};

export const moduleIdParamsSchema = z
  .object({
    id: positiveIdSchema,
  })
  .strict();

export const listModulesQuerySchema = z
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

    vocationalProgrammeId:
      optionalPositiveIdSchema,

    academicLevelId:
      optionalPositiveIdSchema,
  })
  .strict();

export const createModuleSchema = z
  .object({
    ...moduleFields,

    sortOrder:
      sortOrderSchema.default(0),

    isActive: z
      .boolean({
        message:
          'El estado activo debe ser verdadero o falso.',
      })
      .default(true),
  })
  .strict();

export const updateModuleSchema = z
  .object({
    ...moduleFields,

    isActive: z.boolean({
      message:
        'El estado activo debe ser verdadero o falso.',
    }),
  })
  .strict();

export type ModuleIdParams = z.infer<
  typeof moduleIdParamsSchema
>;

export type ListModulesQuery = z.infer<
  typeof listModulesQuerySchema
>;

export type CreateModuleInput = z.infer<
  typeof createModuleSchema
>;

export type UpdateModuleInput = z.infer<
  typeof updateModuleSchema
>;