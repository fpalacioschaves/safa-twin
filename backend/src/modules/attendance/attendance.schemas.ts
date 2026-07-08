import { z } from 'zod';

const attendanceTypes = [
  'ABSENCE',
  'DELAY',
  'EARLY_DEPARTURE',
] as const;

const attendanceTypeFilters = [
  'all',
  ...attendanceTypes,
] as const;

const justificationFilters = [
  'all',
  'justified',
  'unjustified',
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

const requiredDateSchema = z
  .string({
    message: 'La fecha es obligatoria.',
  })
  .trim()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    {
      message: 'La fecha debe tener formato AAAA-MM-DD.',
    },
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
  requiredDateSchema.optional(),
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
      return undefined;
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
    .optional(),
);

const optionalShortTextSchema = z.preprocess(
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
      message: 'El texto indicado no es válido.',
    })
    .trim()
    .max(100, {
      message: 'El texto no puede superar los 100 caracteres.',
    })
    .optional(),
);

const optionalMinutesSchema = z.preprocess(
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
      message: 'Los minutos deben ser numéricos.',
    })
    .int({
      message: 'Los minutos deben ser un número entero.',
    })
    .positive({
      message: 'Los minutos deben ser mayores que cero.',
    })
    .max(600, {
      message: 'Los minutos no pueden superar 600.',
    })
    .optional(),
);

const commonAttendanceFilterFields = {
  type: z.enum(attendanceTypeFilters).default('all'),
  justification: z.enum(justificationFilters).default('all'),
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

export const attendanceRecordIdParamsSchema = z
  .object({
    id: requiredPositiveIdSchema,
  })
  .strict();

export const listAttendanceRecordsQuerySchema = z
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

    ...commonAttendanceFilterFields,
  })
  .strict()
  .refine(
    validateDateRange,
    {
      message: 'La fecha inicial no puede ser posterior a la fecha final.',
      path: ['dateFrom'],
    },
  );

export const attendanceSummaryQuerySchema = z
  .object(commonAttendanceFilterFields)
  .strict()
  .refine(
    validateDateRange,
    {
      message: 'La fecha inicial no puede ser posterior a la fecha final.',
      path: ['dateFrom'],
    },
  );

const attendanceRecordFields = {
  studentId: requiredPositiveIdSchema,
  academicYearId: requiredPositiveIdSchema,
  centreId: requiredPositiveIdSchema,
  moduleId: requiredPositiveIdSchema,
  recordedAt: requiredDateSchema,
  type: z.enum(attendanceTypes, {
    message: 'El tipo de registro de asistencia no es válido.',
  }),
  minutes: optionalMinutesSchema,
  isJustified: z.boolean().default(false),
  sessionLabel: optionalShortTextSchema,
  remarks: optionalTextSchema,
};

export const createAttendanceRecordSchema = z
  .object(attendanceRecordFields)
  .strict();

export const updateAttendanceRecordSchema = z
  .object(attendanceRecordFields)
  .strict();

export type ListAttendanceRecordsQuery = z.infer<
  typeof listAttendanceRecordsQuerySchema
>;

export type AttendanceSummaryQuery = z.infer<
  typeof attendanceSummaryQuerySchema
>;

export type CreateAttendanceRecordInput = z.infer<
  typeof createAttendanceRecordSchema
>;

export type UpdateAttendanceRecordInput = z.infer<
  typeof updateAttendanceRecordSchema
>;
