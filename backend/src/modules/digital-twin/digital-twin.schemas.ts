import { z } from 'zod';

const programmeAcronymsSchema = z.preprocess(
  (value) => (Array.isArray(value) ? value : []),
  z
    .array(
      z
        .string()
        .trim()
        .min(2)
        .max(20)
        .transform((item) => item.toUpperCase()),
    )
    .default([]),
);

const nullableTrimmedTextSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length === 0
      ? null
      : trimmedValue;
  },
  z.string().max(500).nullable(),
);

export const digitalTwinMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(3, 'La petición debe tener al menos 3 caracteres.')
    .max(4000, 'La petición no puede superar los 4000 caracteres.'),
});

export const digitalTwinIntentSchema = z.object({
  intent: z.enum([
    'GENERAL_QUERY',
    'STUDENTS_QUERY',
    'EVALUATION_REPORT',
    'WORK_PLACEMENT_SUMMARY',
    'EMAIL_DRAFT',
    'CURRICULUM_QUERY',
  ]),

  programmeAcronyms: programmeAcronymsSchema,

  academicLevelNumber: z
    .number()
    .int()
    .min(1)
    .max(4)
    .nullable()
    .default(null),

  evaluationCode: nullableTrimmedTextSchema.default(null),

  topic: nullableTrimmedTextSchema.default(null),

  confidence: z
    .number()
    .min(0)
    .max(1)
    .default(0.5),
});

export type DigitalTwinMessageInput = z.infer<
  typeof digitalTwinMessageSchema
>;

export type DigitalTwinIntent = z.infer<
  typeof digitalTwinIntentSchema
>;
