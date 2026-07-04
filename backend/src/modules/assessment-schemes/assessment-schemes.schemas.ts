import { z } from 'zod';

const componentTypes = [
  'ACTIVITIES',
  'SELF_ASSESSMENTS',
  'FORUMS',
  'COMPANY',
  'OTHER',
] as const;

const statusFilters = [
  'all',
  'active',
  'inactive',
  'archived',
] as const;

const dualFilters = [
  'all',
  'dual',
  'non-dual',
] as const;

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

const requiredPositiveIdSchema =
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
    });

const optionalRemarksSchema =
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
          'Las observaciones deben ser texto.',
      })
      .trim()
      .max(5000, {
        message:
          'Las observaciones no pueden superar los 5000 caracteres.',
      })
      .optional(),
  );

const componentCodeSchema = z
  .string({
    message:
      'El código del componente es obligatorio.',
  })
  .trim()
  .min(2, {
    message:
      'El código del componente debe tener al menos 2 caracteres.',
  })
  .max(50, {
    message:
      'El código del componente no puede superar los 50 caracteres.',
  })
  .regex(
    /^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/,
    {
      message:
        'El código del componente solo puede contener letras, números, guiones y guiones bajos.',
    },
  )
  .transform((value) =>
    value.toUpperCase(),
  );

const componentPercentageSchema = z.coerce
  .number({
    message:
      'El porcentaje debe ser numérico.',
  })
  .min(0, {
    message:
      'El porcentaje no puede ser negativo.',
  })
  .max(100, {
    message:
      'El porcentaje no puede superar el 100%.',
  })
  .refine(
    (value) =>
      Number.isFinite(value)
      && Number.isInteger(
        Math.round(value * 100),
      ),
    {
      message:
        'El porcentaje debe tener como máximo dos decimales.',
    },
  );

export const assessmentSchemeIdParamsSchema =
  z
    .object({
      id: requiredPositiveIdSchema,
    })
    .strict();

export const listAssessmentSchemesQuerySchema =
  z
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
        .enum(statusFilters)
        .default('all'),

      dual: z
        .enum(dualFilters)
        .default('all'),

      academicYearId: optionalPositiveIdSchema,
      centreId: optionalPositiveIdSchema,
      moduleId: optionalPositiveIdSchema,
    })
    .strict();

const assessmentComponentInputSchema =
  z
    .object({
      code: componentCodeSchema,

      name: z
        .string({
          message:
            'El nombre del componente es obligatorio.',
        })
        .trim()
        .min(2, {
          message:
            'El nombre del componente debe tener al menos 2 caracteres.',
        })
        .max(150, {
          message:
            'El nombre del componente no puede superar los 150 caracteres.',
        }),

      type: z
        .enum(componentTypes)
        .default('OTHER'),

      percentage: componentPercentageSchema,

      sortOrder: z.coerce
        .number({
          message:
            'El orden debe ser numérico.',
        })
        .int({
          message:
            'El orden debe ser un número entero.',
        })
        .min(0, {
          message:
            'El orden no puede ser negativo.',
        })
        .default(0),

      isRequired: z
        .boolean({
          message:
            'El indicador obligatorio debe ser verdadero o falso.',
        })
        .default(true),

      isCompanyComponent: z
        .boolean({
          message:
            'El indicador de empresa debe ser verdadero o falso.',
        })
        .default(false),
    })
    .strict();

const schemeFields = {
  academicYearId: requiredPositiveIdSchema,
  centreId: requiredPositiveIdSchema,
  moduleId: requiredPositiveIdSchema,

  name: z
    .string({
      message:
        'El nombre del sistema de calificación es obligatorio.',
    })
    .trim()
    .min(2, {
      message:
        'El nombre debe tener al menos 2 caracteres.',
    })
    .max(150, {
      message:
        'El nombre no puede superar los 150 caracteres.',
    }),

  isDual: z
    .boolean({
      message:
        'El indicador de dualización debe ser verdadero o falso.',
    })
    .default(false),

  isActive: z
    .boolean({
      message:
        'El estado activo debe ser verdadero o falso.',
    })
    .default(true),

  remarks: optionalRemarksSchema,

  components: z
    .array(assessmentComponentInputSchema, {
      message:
        'Los componentes deben enviarse como una lista.',
    })
    .min(1, {
      message:
        'Debe existir al menos un componente de calificación.',
    })
    .max(10, {
      message:
        'No se pueden configurar más de 10 componentes.',
    }),
};

export const createAssessmentSchemeSchema =
  z
    .object(schemeFields)
    .strict();

export const updateAssessmentSchemeSchema =
  z
    .object({
      ...schemeFields,
      isActive: z.boolean({
        message:
          'El estado activo debe ser verdadero o falso.',
      }),
    })
    .strict();

export type AssessmentSchemeIdParams =
  z.infer<
    typeof assessmentSchemeIdParamsSchema
  >;

export type ListAssessmentSchemesQuery =
  z.infer<
    typeof listAssessmentSchemesQuerySchema
  >;

export type CreateAssessmentSchemeInput =
  z.infer<
    typeof createAssessmentSchemeSchema
  >;

export type UpdateAssessmentSchemeInput =
  z.infer<
    typeof updateAssessmentSchemeSchema
  >;
