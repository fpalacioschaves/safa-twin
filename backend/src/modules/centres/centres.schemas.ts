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

const centreCodeSchema = z
  .string({
    message:
      'El código del centro es obligatorio.',
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
    /^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/,
    {
      message:
        'El código solo puede contener letras, números, guiones y guiones bajos.',
    },
  )
  .transform((value) =>
    value.toUpperCase(),
  );

const centreNameSchema = z
  .string({
    message:
      'El nombre del centro es obligatorio.',
  })
  .trim()
  .min(2, {
    message:
      'El nombre debe tener al menos 2 caracteres.',
  })
  .max(191, {
    message:
      'El nombre no puede superar los 191 caracteres.',
  });

const optionalEmailSchema = z.preprocess(
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
        'El correo electrónico debe ser una cadena de texto.',
    })
    .trim()
    .toLowerCase()
    .email({
      message:
        'El correo electrónico no tiene un formato válido.',
    })
    .max(191, {
      message:
        'El correo electrónico no puede superar los 191 caracteres.',
    })
    .optional(),
);

const centreFields = {
  code: centreCodeSchema,
  name: centreNameSchema,

  shortName: createOptionalStringSchema(
    'El nombre corto',
    100,
  ),

  taxId: createOptionalStringSchema(
    'El CIF o NIF',
    20,
  ),

  address: createOptionalStringSchema(
    'La dirección',
    255,
  ),

  postalCode: createOptionalStringSchema(
    'El código postal',
    10,
  ),

  city: createOptionalStringSchema(
    'La ciudad',
    100,
  ),

  province: createOptionalStringSchema(
    'La provincia',
    100,
  ),

  phone: createOptionalStringSchema(
    'El teléfono',
    30,
  ),

  email: optionalEmailSchema,
};

export const centreIdParamsSchema = z
  .object({
    id: z.coerce
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

export const listCentresQuerySchema = z
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
  })
  .strict();

export const createCentreSchema = z
  .object({
    ...centreFields,

    isActive: z
      .boolean({
        message:
          'El estado activo debe ser verdadero o falso.',
      })
      .default(true),
  })
  .strict();

export const updateCentreSchema = z
  .object({
    ...centreFields,

    isActive: z.boolean({
      message:
        'El estado activo debe ser verdadero o falso.',
    }),
  })
  .strict();

export type CentreIdParams = z.infer<
  typeof centreIdParamsSchema
>;

export type ListCentresQuery = z.infer<
  typeof listCentresQuerySchema
>;

export type CreateCentreInput = z.infer<
  typeof createCentreSchema
>;

export type UpdateCentreInput = z.infer<
  typeof updateCentreSchema
>;