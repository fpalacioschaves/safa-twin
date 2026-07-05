import { z } from 'zod';

const workPlacementStatuses = [
  'PENDING',
  'ASSIGNED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
] as const;

const documentationFilters = [
  'all',
  'pending',
  'complete',
] as const;

const incidentFilters = [
  'all',
  'open',
  'resolved',
] as const;

function emptyToUndefined(value: unknown): unknown {
  if (
    value === ''
    || value === null
    || value === undefined
  ) {
    return undefined;
  }

  if (
    typeof value === 'string'
    && value.trim() === ''
  ) {
    return undefined;
  }

  return value;
}

function optionalIdField(fieldName: string) {
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({
        message: `${fieldName} debe ser un número.`,
      })
      .int({
        message: `${fieldName} debe ser un número entero.`,
      })
      .positive({
        message: `${fieldName} debe ser mayor que cero.`,
      })
      .optional(),
  );
}

const maxRowsSchema = z.coerce
  .number({
    message:
      'El número máximo de filas debe ser numérico.',
  })
  .int({
    message:
      'El número máximo de filas debe ser entero.',
  })
  .min(1, {
    message:
      'El número máximo de filas debe ser mayor que cero.',
  })
  .max(500, {
    message:
      'La vista previa no puede superar 500 filas.',
  })
  .default(100);

export const companyTrainingReportFiltersSchema = z
  .object({
    academicYearId:
      optionalIdField('El curso académico'),

    centreId:
      optionalIdField('El centro'),

    companyId:
      optionalIdField('La empresa'),

    status: z
      .enum([
        'all',
        ...workPlacementStatuses,
      ], {
        message:
          'El estado de estancia no es válido.',
      })
      .default('all'),

    documentationPending: z
      .enum(documentationFilters, {
        message:
          'El filtro de documentación pendiente no es válido.',
      })
      .default('all'),

    incidentStatus: z
      .enum(incidentFilters, {
        message:
          'El filtro de incidencias no es válido.',
      })
      .default('all'),

    maxRows: maxRowsSchema,
  })
  .strict();

export const companyTrainingReportExportSchema = z
  .object({
    academicYearId:
      optionalIdField('El curso académico'),

    centreId:
      optionalIdField('El centro'),

    companyId:
      optionalIdField('La empresa'),

    status: z
      .enum([
        'all',
        ...workPlacementStatuses,
      ], {
        message:
          'El estado de estancia no es válido.',
      })
      .default('all'),

    documentationPending: z
      .enum(documentationFilters, {
        message:
          'El filtro de documentación pendiente no es válido.',
      })
      .default('all'),

    incidentStatus: z
      .enum(incidentFilters, {
        message:
          'El filtro de incidencias no es válido.',
      })
      .default('all'),

    title: z.preprocess(
      emptyToUndefined,
      z
        .string({
          message:
            'El título debe ser una cadena de texto.',
        })
        .trim()
        .min(2, {
          message:
            'El título debe tener al menos 2 caracteres.',
        })
        .max(191, {
          message:
            'El título no puede superar los 191 caracteres.',
        })
        .optional(),
    ),
  })
  .strict();

export type CompanyTrainingReportFilters = z.infer<
  typeof companyTrainingReportFiltersSchema
>;

export type CompanyTrainingReportExportInput = z.infer<
  typeof companyTrainingReportExportSchema
>;
