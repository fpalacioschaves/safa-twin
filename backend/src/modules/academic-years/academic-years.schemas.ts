import { z } from 'zod';

function isValidIsoDate(value: string): boolean {
  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.toISOString().slice(0, 10)
    === value
  );
}

function getAcademicYearNumbers(
  name: string,
): {
  startYear: number;
  endYear: number;
} {
  const [
    startYearText,
    endYearText,
  ] = name.split('/');

  return {
    startYear: Number.parseInt(
      startYearText ?? '',
      10,
    ),

    endYear: Number.parseInt(
      endYearText ?? '',
      10,
    ),
  };
}

const academicYearNameSchema = z
  .string({
    message:
      'El nombre del curso académico es obligatorio.',
  })
  .trim()
  .regex(/^\d{4}\/\d{4}$/, {
    message:
      'El nombre debe tener el formato 2025/2026.',
  })
  .refine(
    (value) => {
      const {
        startYear,
        endYear,
      } = getAcademicYearNumbers(value);

      return endYear === startYear + 1;
    },
    {
      message:
        'Los años del curso académico deben ser consecutivos.',
    },
  );

const isoDateSchema = z
  .string({
    message:
      'La fecha es obligatoria.',
  })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message:
      'La fecha debe tener el formato AAAA-MM-DD.',
  })
  .refine(isValidIsoDate, {
    message:
      'La fecha indicada no es válida.',
  });

function validateAcademicYearData(
  data: {
    name: string;
    startDate: string;
    endDate: string;
  },
  context: z.RefinementCtx,
): void {
  const startDate = new Date(
    `${data.startDate}T00:00:00.000Z`,
  );

  const endDate = new Date(
    `${data.endDate}T00:00:00.000Z`,
  );

  if (
    !Number.isNaN(startDate.getTime())
    && !Number.isNaN(endDate.getTime())
    && startDate >= endDate
  ) {
    context.addIssue({
      code: 'custom',
      path: ['endDate'],
      message:
        'La fecha de finalización debe ser posterior a la fecha de inicio.',
    });
  }

  const {
    startYear,
    endYear,
  } = getAcademicYearNumbers(data.name);

  if (
    Number.isInteger(startYear)
    && !Number.isNaN(startDate.getTime())
    && startDate.getUTCFullYear()
    !== startYear
  ) {
    context.addIssue({
      code: 'custom',
      path: ['startDate'],
      message:
        'El año de la fecha de inicio no coincide con el nombre del curso.',
    });
  }

  if (
    Number.isInteger(endYear)
    && !Number.isNaN(endDate.getTime())
    && endDate.getUTCFullYear()
    !== endYear
  ) {
    context.addIssue({
      code: 'custom',
      path: ['endDate'],
      message:
        'El año de la fecha de finalización no coincide con el nombre del curso.',
    });
  }
}

export const academicYearIdParamsSchema = z
  .object({
    id: z.coerce
      .number()
      .int({
        message:
          'El identificador del curso debe ser un número entero.',
      })
      .positive({
        message:
          'El identificador del curso debe ser mayor que cero.',
      }),
  })
  .strict();

export const listAcademicYearsQuerySchema = z
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

    current: z
      .enum([
        'all',
        'current',
        'not-current',
      ])
      .default('all'),
  })
  .strict();

export const createAcademicYearSchema = z
  .object({
    name: academicYearNameSchema,
    startDate: isoDateSchema,
    endDate: isoDateSchema,

    isActive: z
      .boolean({
        message:
          'El estado activo debe ser verdadero o falso.',
      })
      .default(true),
  })
  .strict()
  .superRefine(
    validateAcademicYearData,
  );

export const updateAcademicYearSchema = z
  .object({
    name: academicYearNameSchema,
    startDate: isoDateSchema,
    endDate: isoDateSchema,

    isActive: z.boolean({
      message:
        'El estado activo debe ser verdadero o falso.',
    }),
  })
  .strict()
  .superRefine(
    validateAcademicYearData,
  );

export type AcademicYearIdParams = z.infer<
  typeof academicYearIdParamsSchema
>;

export type ListAcademicYearsQuery = z.infer<
  typeof listAcademicYearsQuerySchema
>;

export type CreateAcademicYearInput = z.infer<
  typeof createAcademicYearSchema
>;

export type UpdateAcademicYearInput = z.infer<
  typeof updateAcademicYearSchema
>;