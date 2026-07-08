import { z } from 'zod';

const documentTypes = [
  'DNI',
  'NIE',
  'PASSPORT',
  'OTHER',
] as const;

function optionalString(
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

const optionalStudentCodeSchema =
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
          'El código del alumno debe ser una cadena de texto.',
      })
      .trim()
      .min(2, {
        message:
          'El código del alumno debe tener al menos 2 caracteres.',
      })
      .max(50, {
        message:
          'El código del alumno no puede superar los 50 caracteres.',
      })
      .regex(
        /^[A-Za-z0-9]+(?:[-_./][A-Za-z0-9]+)*$/,
        {
          message:
            'El código del alumno solo puede contener letras, números, puntos, barras, guiones y guiones bajos.',
        },
      )
      .transform((value) => value.toUpperCase())
      .optional(),
  );

const optionalDocumentNumberSchema =
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
          'El número de documento debe ser una cadena de texto.',
      })
      .trim()
      .min(3, {
        message:
          'El número de documento debe tener al menos 3 caracteres.',
      })
      .max(30, {
        message:
          'El número de documento no puede superar los 30 caracteres.',
      })
      .regex(
        /^[A-Za-z0-9][-A-Za-z0-9 ]*$/,
        {
          message:
            'El número de documento solo puede contener letras, números, espacios y guiones.',
        },
      )
      .transform((value) =>
        value.replace(/\s+/g, '').toUpperCase(),
      )
      .optional(),
  );

const optionalEmailSchema =
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

const optionalBirthDateSchema =
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
    z
      .string({
        message:
          'La fecha de nacimiento debe enviarse como texto.',
      })
      .trim()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        {
          message:
            'La fecha de nacimiento debe tener formato AAAA-MM-DD.',
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
            'La fecha de nacimiento no es válida.',
        },
      )
      .optional(),
  );

const studentFields = {
  studentCode:
    optionalStudentCodeSchema,

  firstName: z
    .string({
      message:
        'El nombre del alumno es obligatorio.',
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

  lastName1: z
    .string({
      message:
        'El primer apellido es obligatorio.',
    })
    .trim()
    .min(2, {
      message:
        'El primer apellido debe tener al menos 2 caracteres.',
    })
    .max(100, {
      message:
        'El primer apellido no puede superar los 100 caracteres.',
    }),

  lastName2:
    optionalString(
      'El segundo apellido',
      100,
    ),

  documentType: z.preprocess(
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
    z
      .enum(documentTypes, {
        message:
          'El tipo de documento no es válido.',
      })
      .optional(),
  ),

  documentNumber:
    optionalDocumentNumberSchema,

  email:
    optionalEmailSchema,

  phone:
    optionalString('El teléfono', 30),

  birthDate:
    optionalBirthDateSchema,

  address:
    optionalString('La dirección', 255),

  postalCode:
    optionalString('El código postal', 10),

  city:
    optionalString('La localidad', 100),

  province:
    optionalString('La provincia', 100),

  emergencyContactName:
    optionalString(
      'El contacto de emergencia',
      150,
    ),

  emergencyContactPhone:
    optionalString(
      'El teléfono de emergencia',
      30,
    ),

  notes:
    optionalString(
      'Las observaciones',
      5000,
    ),
};

export const studentIdParamsSchema = z
  .object({
    id: z.coerce
      .number()
      .int({
        message:
          'El identificador del alumno debe ser un número entero.',
      })
      .positive({
        message:
          'El identificador del alumno debe ser mayor que cero.',
      }),
  })
  .strict();

export const listStudentsQuerySchema = z
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
      .enum([
        'all',
        'active',
        'inactive',
        'archived',
      ])
      .default('all'),

    documentType: z
      .enum([
        'all',
        ...documentTypes,
      ])
      .default('all'),
  })
  .strict();

export const createStudentSchema = z
  .object({
    ...studentFields,

    isActive: z
      .boolean({
        message:
          'El estado activo debe ser verdadero o falso.',
      })
      .default(true),
  })
  .strict();

export const updateStudentSchema = z
  .object({
    ...studentFields,

    isActive: z.boolean({
      message:
        'El estado activo debe ser verdadero o falso.',
    }),
  })
  .strict();

export type StudentIdParams = z.infer<
  typeof studentIdParamsSchema
>;

export type ListStudentsQuery = z.infer<
  typeof listStudentsQuerySchema
>;

export type CreateStudentInput = z.infer<
  typeof createStudentSchema
>;

export type UpdateStudentInput = z.infer<
  typeof updateStudentSchema
>;
