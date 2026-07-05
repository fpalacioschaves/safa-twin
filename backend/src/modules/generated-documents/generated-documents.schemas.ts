import { z } from 'zod';

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
    .number({
      message: 'El identificador debe ser numérico.',
    })
    .int({
      message: 'El identificador debe ser un número entero.',
    })
    .positive({
      message: 'El identificador debe ser mayor que cero.',
    })
    .optional(),
);

export const generatedDocumentsQuerySchema = z
  .object({
    page: z.coerce
      .number({
        message: 'La página debe ser numérica.',
      })
      .int({
        message: 'La página debe ser un número entero.',
      })
      .min(1, {
        message: 'La página debe ser mayor que cero.',
      })
      .default(1),
    pageSize: z.coerce
      .number({
        message: 'El tamaño de página debe ser numérico.',
      })
      .int({
        message: 'El tamaño de página debe ser un número entero.',
      })
      .min(1, {
        message: 'El tamaño de página debe ser mayor que cero.',
      })
      .max(100, {
        message: 'El tamaño máximo de página es 100.',
      })
      .default(10),
    documentType: z
      .string()
      .trim()
      .max(80, {
        message: 'El tipo de documento no puede superar 80 caracteres.',
      })
      .optional(),
  })
  .strict();

export const generatedDocumentParamsSchema = z
  .object({
    id: optionalPositiveIdSchema,
  })
  .strict();

export type GeneratedDocumentsQuery = z.infer<
  typeof generatedDocumentsQuerySchema
>;

export type GeneratedDocumentParams = z.infer<
  typeof generatedDocumentParamsSchema
>;
