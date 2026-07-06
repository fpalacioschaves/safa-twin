import {
  z,
} from 'zod';

import {
  DOCUMENT_OUTPUT_FORMATS,
  DOCUMENT_TEMPLATE_CATEGORIES,
  DOCUMENT_TEMPLATE_SCOPES,
} from './document-template.types.js';

export const documentTemplateParamsSchema = z.object({
  code: z
    .string()
    .trim()
    .min(
      1,
      'El código de la plantilla es obligatorio.',
    ),
});

export const documentTemplateListQuerySchema = z.object({
  category: z
    .enum(DOCUMENT_TEMPLATE_CATEGORIES)
    .optional(),

  scope: z
    .enum(DOCUMENT_TEMPLATE_SCOPES)
    .optional(),

  outputFormat: z
    .enum(DOCUMENT_OUTPUT_FORMATS)
    .optional(),

  search: z
    .string()
    .trim()
    .min(
      1,
      'El texto de búsqueda no puede estar vacío.',
    )
    .optional(),

  activeOnly: z
    .preprocess(
      (value) => {
        if (value === undefined) {
          return undefined;
        }

        if (value === 'false') {
          return false;
        }

        if (value === 'true') {
          return true;
        }

        return value;
      },
      z
        .boolean()
        .optional(),
    ),
});

export const documentTemplateValidationBodySchema = z.object({
  outputFormat: z
    .enum(DOCUMENT_OUTPUT_FORMATS)
    .optional(),

  context: z
    .record(
      z.string(),
      z.unknown(),
    )
    .optional(),
});

export const documentTemplateGenerationBodySchema = z.object({
  outputFormat: z
    .enum(DOCUMENT_OUTPUT_FORMATS),

  context: z
    .record(
      z.string(),
      z.unknown(),
    )
    .optional(),
});

export type DocumentTemplateParams =
  z.infer<typeof documentTemplateParamsSchema>;

export type DocumentTemplateListQuery =
  z.infer<typeof documentTemplateListQuerySchema>;

export type DocumentTemplateValidationBody =
  z.infer<typeof documentTemplateValidationBodySchema>;

export type DocumentTemplateGenerationBody =
  z.infer<typeof documentTemplateGenerationBodySchema>;
