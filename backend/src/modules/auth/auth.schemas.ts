import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, {
        message: 'El correo electrónico es obligatorio.',
      })
      .max(191, {
        message: 'El correo electrónico es demasiado largo.',
      })
      .email({
        message: 'El correo electrónico no tiene un formato válido.',
      }),

    password: z
      .string()
      .min(1, {
        message: 'La contraseña es obligatoria.',
      })
      .max(200, {
        message: 'La contraseña es demasiado larga.',
      }),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;