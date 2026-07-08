import { z } from 'zod';

const incidentTypes = [
  'ACADEMIC',
  'BEHAVIOUR',
  'DISCIPLINARY',
  'TECHNICAL',
  'COMPANY_RELATED',
  'OTHER',
] as const;

const incidentSeverities = [
  'LOW',
  'MEDIUM',
  'HIGH',
] as const;

const incidentTypeFilters = [
  'all',
  ...incidentTypes,
] as const;

const incidentSeverityFilters = [
  'all',
  ...incidentSeverities,
] as const;

const incidentResolutionFilters = [
  'all',
  'resolved',
  'unresolved',
] as const;

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

const nullablePositiveIdSchema = z.preprocess(
  (value) => {
    if (
      value === ''
      || value === null
      || value === undefined
    ) {
      return null;
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
    .nullable(),
);

const requiredPositiveIdSchema = z.coerce
  .number({
    message: 'El identificador debe ser numérico.',
  })
  .int({
    message: 'El identificador debe ser un número entero.',
  })
  .positive({
    message: 'El identificador debe ser mayor que cero.',
  });

const requiredDateTimeSchema = z
  .string({
    message: 'La fecha y hora son obligatorias.',
  })
  .trim()
  .datetime({
    offset: true,
    message: 'La fecha y hora deben tener formato ISO con zona horaria.',
  });

const optionalDateTimeSchema = z.preprocess(
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
  requiredDateTimeSchema.optional(),
);

const optionalDateSchema = z.preprocess(
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
      message: 'La fecha indicada no es válida.',
    })
    .trim()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      {
        message: 'La fecha debe tener formato AAAA-MM-DD.',
      },
    )
    .optional(),
);

const optionalTextSchema = z.preprocess(
  (value) => {
    if (
      value === null
      || value === undefined
      || (
        typeof value === 'string'
        && value.trim() === ''
      )
    ) {
      return null;
    }

    return value;
  },
  z
    .string({
      message: 'El texto indicado no es válido.',
    })
    .trim()
    .max(5000, {
      message: 'El texto no puede superar los 5000 caracteres.',
    })
    .nullable(),
);

const requiredTitleSchema = z
  .string({
    message: 'El título es obligatorio.',
  })
  .trim()
  .min(3, {
    message: 'El título debe tener al menos 3 caracteres.',
  })
  .max(191, {
    message: 'El título no puede superar los 191 caracteres.',
  });

const requiredDescriptionSchema = z
  .string({
    message: 'La descripción es obligatoria.',
  })
  .trim()
  .min(3, {
    message: 'La descripción debe tener al menos 3 caracteres.',
  })
  .max(5000, {
    message: 'La descripción no puede superar los 5000 caracteres.',
  });

const commonIncidentFilterFields = {
  type: z.enum(incidentTypeFilters).default('all'),
  severity: z.enum(incidentSeverityFilters).default('all'),
  resolution: z.enum(incidentResolutionFilters).default('all'),
  academicYearId: optionalPositiveIdSchema,
  centreId: optionalPositiveIdSchema,
  moduleId: optionalPositiveIdSchema,
  studentId: optionalPositiveIdSchema,
  vocationalProgrammeId: optionalPositiveIdSchema,
  academicLevelId: optionalPositiveIdSchema,
  dateFrom: optionalDateSchema,
  dateTo: optionalDateSchema,
};

function validateDateRange(value: {
  dateFrom?: string;
  dateTo?: string;
}): boolean {
  if (!value.dateFrom || !value.dateTo) {
    return true;
  }

  return value.dateFrom <= value.dateTo;
}

export const incidentIdParamsSchema = z
  .object({
    id: requiredPositiveIdSchema,
  })
  .strict();

export const listIncidentsQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(100, {
        message: 'La búsqueda no puede superar los 100 caracteres.',
      })
      .optional()
      .transform((value) => value || undefined),

    page: z.coerce
      .number()
      .int({
        message: 'La página debe ser un número entero.',
      })
      .min(1, {
        message: 'La página debe ser mayor o igual que 1.',
      })
      .default(1),

    pageSize: z.coerce
      .number()
      .int({
        message: 'El tamaño de página debe ser un número entero.',
      })
      .min(1, {
        message: 'El tamaño de página debe ser mayor que cero.',
      })
      .max(100, {
        message: 'El tamaño de página no puede superar 100.',
      })
      .default(20),

    ...commonIncidentFilterFields,
  })
  .strict()
  .refine(
    validateDateRange,
    {
      message: 'La fecha inicial no puede ser posterior a la fecha final.',
      path: ['dateFrom'],
    },
  );

export const incidentSummaryQuerySchema = z
  .object(commonIncidentFilterFields)
  .strict()
  .refine(
    validateDateRange,
    {
      message: 'La fecha inicial no puede ser posterior a la fecha final.',
      path: ['dateFrom'],
    },
  );

const incidentFields = {
  studentId: requiredPositiveIdSchema,
  academicYearId: requiredPositiveIdSchema,
  centreId: requiredPositiveIdSchema,
  moduleId: nullablePositiveIdSchema,
  type: z.enum(incidentTypes, {
    message: 'El tipo de incidencia no es válido.',
  }),
  severity: z.enum(incidentSeverities, {
    message: 'La gravedad de la incidencia no es válida.',
  }),
  occurredAt: requiredDateTimeSchema,
  title: requiredTitleSchema,
  description: requiredDescriptionSchema,
  resolution: optionalTextSchema,
  resolvedAt: optionalDateTimeSchema,
};

export const createIncidentSchema = z
  .object(incidentFields)
  .strict();

export const updateIncidentSchema = z
  .object(incidentFields)
  .strict();

export type ListIncidentsQuery = z.infer<
  typeof listIncidentsQuerySchema
>;

export type IncidentSummaryQuery = z.infer<
  typeof incidentSummaryQuerySchema
>;

export type CreateIncidentInput = z.infer<
  typeof createIncidentSchema
>;

export type UpdateIncidentInput = z.infer<
  typeof updateIncidentSchema
>;
