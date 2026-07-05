import { z } from 'zod';

const optionalPositiveIdSchema =
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
    z.coerce
      .number({
        message:
          'El identificador debe ser numérico.',
      })
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

export const academicStatisticsQuerySchema =
  z
    .object({
      academicYearId: optionalPositiveIdSchema,
      centreId: optionalPositiveIdSchema,
      vocationalProgrammeId:
        optionalPositiveIdSchema,
      academicLevelId: optionalPositiveIdSchema,
      moduleId: optionalPositiveIdSchema,
      evaluationId: optionalPositiveIdSchema,
    })
    .strict();

export type AcademicStatisticsQuery =
  z.infer<
    typeof academicStatisticsQuerySchema
  >;
