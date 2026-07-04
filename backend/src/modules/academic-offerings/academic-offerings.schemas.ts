import { z } from 'zod';

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

const studyModalitySchema = z.enum(
  [
    'PRESENTIAL',
    'ONLINE',
    'BLENDED',
  ],
  {
    message:
      'La modalidad debe ser PRESENTIAL, ONLINE o BLENDED.',
  },
);

const academicOfferingFields = {
  academicYearId:
    positiveIdSchema,

  centreId:
    positiveIdSchema,

  vocationalProgrammeId:
    positiveIdSchema,

  academicLevelId:
    positiveIdSchema,

  modality:
    studyModalitySchema,
};

export const academicOfferingIdParamsSchema = z
  .object({
    id: positiveIdSchema,
  })
  .strict();

export const listAcademicOfferingsQuerySchema = z
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

    modality: z
      .enum([
        'all',
        'PRESENTIAL',
        'ONLINE',
        'BLENDED',
      ])
      .default('all'),

    academicYearId:
      optionalPositiveIdSchema,

    centreId:
      optionalPositiveIdSchema,

    vocationalProgrammeId:
      optionalPositiveIdSchema,

    academicLevelId:
      optionalPositiveIdSchema,
  })
  .strict();

export const createAcademicOfferingSchema = z
  .object({
    ...academicOfferingFields,

    isActive: z
      .boolean({
        message:
          'El estado activo debe ser verdadero o falso.',
      })
      .default(true),
  })
  .strict();

export const updateAcademicOfferingSchema = z
  .object({
    ...academicOfferingFields,

    isActive: z.boolean({
      message:
        'El estado activo debe ser verdadero o falso.',
    }),
  })
  .strict();

export type AcademicOfferingIdParams = z.infer<
  typeof academicOfferingIdParamsSchema
>;

export type ListAcademicOfferingsQuery = z.infer<
  typeof listAcademicOfferingsQuerySchema
>;

export type CreateAcademicOfferingInput = z.infer<
  typeof createAcademicOfferingSchema
>;

export type UpdateAcademicOfferingInput = z.infer<
  typeof updateAcademicOfferingSchema
>;