import { z } from 'zod';

const MINIMUM_PASSWORD_LENGTH = 12;
const MAXIMUM_BCRYPT_PASSWORD_BYTES = 72;

const nameSchema = z
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
  });

const emailSchema = z
  .string({
    message:
      'El correo electrónico es obligatorio.',
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
  });

const passwordSchema = z
  .string({
    message:
      'La contraseña es obligatoria.',
  })
  .min(MINIMUM_PASSWORD_LENGTH, {
    message:
      `La contraseña debe tener al menos ${MINIMUM_PASSWORD_LENGTH} caracteres.`,
  })
  .refine(
    (password) => (
      Buffer.byteLength(
        password,
        'utf8',
      ) <= MAXIMUM_BCRYPT_PASSWORD_BYTES
    ),
    {
      message:
        'La contraseña supera el máximo de 72 bytes admitido por bcrypt.',
    },
  );

const roleIdsSchema = z
  .array(
    z
      .number({
        message:
          'Cada rol debe identificarse mediante un número.',
      })
      .int({
        message:
          'El identificador del rol debe ser un número entero.',
      })
      .positive({
        message:
          'El identificador del rol debe ser mayor que cero.',
      }),
  )
  .min(1, {
    message:
      'Debes seleccionar al menos un rol.',
  })
  .refine(
    (roleIds) => (
      new Set(roleIds).size === roleIds.length
    ),
    {
      message:
        'No se puede asignar el mismo rol más de una vez.',
    },
  );

export const userIdParamsSchema = z
  .object({
    id: z.coerce
      .number()
      .int({
        message:
          'El identificador del usuario debe ser un número entero.',
      })
      .positive({
        message:
          'El identificador del usuario debe ser mayor que cero.',
      }),
  })
  .strict();

export const listUsersQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(100, {
        message:
          'La búsqueda no puede superar los 100 caracteres.',
      })
      .optional()
      .transform((value) => value || undefined),

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
          'El tamaño de página debe ser mayor que 0.',
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
        'archived',
      ])
      .default('all'),
  })
  .strict();

export const createUserSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,

    passwordConfirmation: z.string({
      message:
        'Debes confirmar la contraseña.',
    }),

    roleIds: roleIdsSchema,
  })
  .strict()
  .refine(
    (data) => (
      data.password
      === data.passwordConfirmation
    ),
    {
      message:
        'Las contraseñas no coinciden.',

      path: [
        'passwordConfirmation',
      ],
    },
  );

export const updateUserSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,

    password: passwordSchema.optional(),

    passwordConfirmation: z
      .string()
      .optional(),

    roleIds: roleIdsSchema,
  })
  .strict()
  .superRefine((data, context) => {
    const passwordWasProvided =
      data.password !== undefined;

    const confirmationWasProvided =
      data.passwordConfirmation !== undefined;

    if (
      passwordWasProvided
      && !confirmationWasProvided
    ) {
      context.addIssue({
        code: 'custom',

        path: [
          'passwordConfirmation',
        ],

        message:
          'Debes confirmar la nueva contraseña.',
      });

      return;
    }

    if (
      !passwordWasProvided
      && confirmationWasProvided
    ) {
      context.addIssue({
        code: 'custom',

        path: [
          'password',
        ],

        message:
          'Debes introducir la nueva contraseña.',
      });

      return;
    }

    if (
      passwordWasProvided
      && confirmationWasProvided
      && data.password
      !== data.passwordConfirmation
    ) {
      context.addIssue({
        code: 'custom',

        path: [
          'passwordConfirmation',
        ],

        message:
          'Las contraseñas no coinciden.',
      });
    }
  });

export const updateUserStatusSchema = z
  .object({
    isActive: z.boolean({
      message:
        'El estado del usuario debe ser verdadero o falso.',
    }),
  })
  .strict();

export type UserIdParams = z.infer<
  typeof userIdParamsSchema
>;

export type ListUsersQuery = z.infer<
  typeof listUsersQuerySchema
>;

export type CreateUserInput = z.infer<
  typeof createUserSchema
>;

export type UpdateUserInput = z.infer<
  typeof updateUserSchema
>;

export type UpdateUserStatusInput = z.infer<
  typeof updateUserStatusSchema
>;