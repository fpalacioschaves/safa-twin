import { z } from "zod";

const workPlacementStatuses = [
  "PENDING",
  "ASSIGNED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;

const placementFollowupTypes = [
  "VISIT",
  "PHONE",
  "EMAIL",
  "MEETING",
  "OTHER",
] as const;

const placementIncidentSeverities = ["LOW", "MEDIUM", "HIGH"] as const;

const recordStatuses = ["all", "active", "inactive", "archived"] as const;

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

function optionalString(fieldName: string, maximumLength: number) {
  return z.preprocess(
    emptyToUndefined,
    z
      .string({
        message: `${fieldName} debe ser una cadena de texto.`,
      })
      .trim()
      .max(maximumLength, {
        message: `${fieldName} no puede superar los ${maximumLength} caracteres.`,
      })
      .optional(),
  );
}

function requiredString(
  fieldName: string,
  minimumLength: number,
  maximumLength: number,
) {
  return z
    .string({
      message: `${fieldName} es obligatorio.`,
    })
    .trim()
    .min(minimumLength, {
      message: `${fieldName} debe tener al menos ${minimumLength} caracteres.`,
    })
    .max(maximumLength, {
      message: `${fieldName} no puede superar los ${maximumLength} caracteres.`,
    });
}

function idField(fieldName: string) {
  return z.coerce
    .number({
      message: `${fieldName} debe ser un número.`,
    })
    .int({
      message: `${fieldName} debe ser un número entero.`,
    })
    .positive({
      message: `${fieldName} debe ser mayor que cero.`,
    });
}

function optionalIdField(fieldName: string) {
  return z.preprocess(emptyToUndefined, idField(fieldName).optional());
}

function optionalNonNegativeInteger(fieldName: string) {
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({
        message: `${fieldName} debe ser un número.`,
      })
      .int({
        message: `${fieldName} debe ser un número entero.`,
      })
      .min(0, {
        message: `${fieldName} no puede ser negativo.`,
      })
      .optional(),
  );
}

const optionalEmailSchema = z.preprocess(
  emptyToUndefined,
  z
    .string({
      message: "El correo electrónico debe ser una cadena de texto.",
    })
    .trim()
    .toLowerCase()
    .email({
      message: "El correo electrónico no tiene un formato válido.",
    })
    .max(191, {
      message: "El correo electrónico no puede superar los 191 caracteres.",
    })
    .optional(),
);

const optionalDateSchema = z.preprocess(
  emptyToUndefined,
  z
    .string({
      message: "La fecha debe enviarse como texto.",
    })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "La fecha debe tener formato AAAA-MM-DD.",
    })
    .refine(
      (value) => {
        const date = new Date(`${value}T00:00:00.000Z`);

        return (
          !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
        );
      },
      {
        message: "La fecha indicada no es válida.",
      },
    )
    .optional(),
);

const optionalDateTimeSchema = z.preprocess(
  emptyToUndefined,
  z
    .string({
      message: "La fecha y hora debe enviarse como texto.",
    })
    .trim()
    .refine(
      (value) => {
        const date = new Date(value);

        return !Number.isNaN(date.getTime());
      },
      {
        message: "La fecha y hora indicada no es válida.",
      },
    )
    .optional(),
);

const requiredDateTimeSchema = z
  .string({
    message: "La fecha y hora es obligatoria.",
  })
  .trim()
  .min(1, {
    message: "La fecha y hora es obligatoria.",
  })
  .refine(
    (value) => {
      const date = new Date(value);

      return !Number.isNaN(date.getTime());
    },
    {
      message: "La fecha y hora indicada no es válida.",
    },
  );

const companyFields = {
  name: requiredString("El nombre de la empresa", 2, 191),

  taxIdentifier: optionalString("El identificador fiscal", 30),

  sector: optionalString("El sector", 120),

  address: optionalString("La dirección", 255),

  postalCode: optionalString("El código postal", 10),

  city: optionalString("La localidad", 100),

  province: optionalString("La provincia", 100),

  phone: optionalString("El teléfono", 30),

  email: optionalEmailSchema,

  website: optionalString("El sitio web", 191),

  notes: optionalString("Las observaciones", 5000),
};

const companyTutorFields = {
  firstName: requiredString("El nombre del tutor laboral", 2, 100),

  lastName: optionalString("Los apellidos del tutor laboral", 150),

  email: optionalEmailSchema,

  phone: optionalString("El teléfono", 30),

  position: optionalString("El cargo", 150),

  notes: optionalString("Las observaciones", 5000),
};

const placementFields = {
  studentId: idField("El alumno"),

  academicYearId: idField("El curso académico"),

  centreId: idField("El centro"),

  companyId: idField("La empresa"),

  companyTutorId: optionalIdField("El tutor laboral"),

  academicTutorUserId: optionalIdField("El tutor académico"),

  status: z
    .enum(workPlacementStatuses, {
      message: "El estado de la formación en empresa no es válido.",
    })
    .default("PENDING"),

  startsAt: optionalDateSchema,

  endsAt: optionalDateSchema,

  schedule: optionalString("El horario", 255),

  totalHours: optionalNonNegativeInteger("Las horas totales"),

  completedHours: optionalNonNegativeInteger("Las horas realizadas"),

  activities: optionalString("Las actividades", 10000),

  learningOutcomes: optionalString("Los resultados de aprendizaje", 10000),

  finalEvaluation: optionalString("La evaluación final", 10000),

  documentationPending: z
    .boolean({
      message: "La documentación pendiente debe ser verdadero o falso.",
    })
    .default(false),

  remarks: optionalString("Las observaciones", 10000),
};

const placementFollowupFields = {
  followupType: z
    .enum(placementFollowupTypes, {
      message: "El tipo de seguimiento no es válido.",
    })
    .default("OTHER"),

  followupAt: requiredDateTimeSchema,

  title: requiredString("El título del seguimiento", 2, 191),

  description: optionalString("La descripción", 10000),

  nextActions: optionalString("Las próximas acciones", 10000),
};

const placementIncidentFields = {
  severity: z
    .enum(placementIncidentSeverities, {
      message: "La gravedad de la incidencia no es válida.",
    })
    .default("MEDIUM"),

  occurredAt: requiredDateTimeSchema,

  title: requiredString("El título de la incidencia", 2, 191),

  description: requiredString("La descripción de la incidencia", 2, 10000),

  resolution: optionalString("La resolución", 10000),

  resolvedAt: optionalDateTimeSchema,
};

function incidentResolutionIsCoherent(data: {
  occurredAt: string;
  resolvedAt?: string;
}): boolean {
  if (!data.resolvedAt) {
    return true;
  }

  return (
    new Date(data.resolvedAt).getTime() >= new Date(data.occurredAt).getTime()
  );
}

function datesAreCoherent(data: {
  startsAt?: string;
  endsAt?: string;
}): boolean {
  if (!data.startsAt || !data.endsAt) {
    return true;
  }

  return data.startsAt <= data.endsAt;
}

function hoursAreCoherent(data: {
  totalHours?: number;
  completedHours?: number;
}): boolean {
  if (data.totalHours === undefined || data.completedHours === undefined) {
    return true;
  }

  return data.completedHours <= data.totalHours;
}

export const entityIdParamsSchema = z
  .object({
    id: idField("El identificador"),
  })
  .strict();

export const companyIdParamsSchema = z
  .object({
    companyId: idField("El identificador de la empresa"),
  })
  .strict();

export const listCompaniesQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(100, {
        message: "La búsqueda no puede superar los 100 caracteres.",
      })
      .optional()
      .transform((value) => value || undefined),

    page: z.coerce
      .number()
      .int({
        message: "La página debe ser un número entero.",
      })
      .min(1, {
        message: "La página debe ser mayor o igual que 1.",
      })
      .default(1),

    pageSize: z.coerce
      .number()
      .int({
        message: "El tamaño de página debe ser un número entero.",
      })
      .min(1, {
        message: "El tamaño de página debe ser mayor que cero.",
      })
      .max(50, {
        message: "El tamaño de página no puede superar 50.",
      })
      .default(10),

    status: z.enum(recordStatuses).default("active"),
  })
  .strict();

export const listCompanyTutorsQuerySchema = z
  .object({
    status: z.enum(recordStatuses).default("active"),
  })
  .strict();

export const listWorkPlacementsQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(100, {
        message: "La búsqueda no puede superar los 100 caracteres.",
      })
      .optional()
      .transform((value) => value || undefined),

    page: z.coerce
      .number()
      .int({
        message: "La página debe ser un número entero.",
      })
      .min(1, {
        message: "La página debe ser mayor o igual que 1.",
      })
      .default(1),

    pageSize: z.coerce
      .number()
      .int({
        message: "El tamaño de página debe ser un número entero.",
      })
      .min(1, {
        message: "El tamaño de página debe ser mayor que cero.",
      })
      .max(50, {
        message: "El tamaño de página no puede superar 50.",
      })
      .default(10),

    recordStatus: z.enum(recordStatuses).default("active"),

    status: z.enum(["all", ...workPlacementStatuses]).default("all"),

    academicYearId: optionalIdField("El curso académico"),

    centreId: optionalIdField("El centro"),

    companyId: optionalIdField("La empresa"),

    studentId: optionalIdField("El alumno"),
  })
  .strict();

export const createCompanySchema = z
  .object({
    ...companyFields,

    isActive: z
      .boolean({
        message: "El estado activo debe ser verdadero o falso.",
      })
      .default(true),
  })
  .strict();

export const updateCompanySchema = z
  .object({
    ...companyFields,

    isActive: z.boolean({
      message: "El estado activo debe ser verdadero o falso.",
    }),
  })
  .strict();

export const createCompanyTutorSchema = z
  .object({
    ...companyTutorFields,

    isActive: z
      .boolean({
        message: "El estado activo debe ser verdadero o falso.",
      })
      .default(true),
  })
  .strict();

export const updateCompanyTutorSchema = z
  .object({
    ...companyTutorFields,

    isActive: z.boolean({
      message: "El estado activo debe ser verdadero o falso.",
    }),
  })
  .strict();

export const createWorkPlacementSchema = z
  .object(placementFields)
  .strict()
  .refine(datesAreCoherent, {
    message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
    path: ["endsAt"],
  })
  .refine(hoursAreCoherent, {
    message: "Las horas realizadas no pueden superar las horas totales.",
    path: ["completedHours"],
  });

export const updateWorkPlacementSchema = z
  .object(placementFields)
  .strict()
  .refine(datesAreCoherent, {
    message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
    path: ["endsAt"],
  })
  .refine(hoursAreCoherent, {
    message: "Las horas realizadas no pueden superar las horas totales.",
    path: ["completedHours"],
  });

export const createPlacementFollowupSchema = z
  .object(placementFollowupFields)
  .strict();

export const updatePlacementFollowupSchema = z
  .object(placementFollowupFields)
  .strict();

export const createPlacementIncidentSchema = z
  .object(placementIncidentFields)
  .strict()
  .refine(incidentResolutionIsCoherent, {
    message:
      "La fecha de resolución no puede ser anterior a la fecha de la incidencia.",
    path: ["resolvedAt"],
  });

export const updatePlacementIncidentSchema = z
  .object(placementIncidentFields)
  .strict()
  .refine(incidentResolutionIsCoherent, {
    message:
      "La fecha de resolución no puede ser anterior a la fecha de la incidencia.",
    path: ["resolvedAt"],
  });

export type EntityIdParams = z.infer<typeof entityIdParamsSchema>;

export type CompanyIdParams = z.infer<typeof companyIdParamsSchema>;

export type ListCompaniesQuery = z.infer<typeof listCompaniesQuerySchema>;

export type ListCompanyTutorsQuery = z.infer<
  typeof listCompanyTutorsQuerySchema
>;

export type ListWorkPlacementsQuery = z.infer<
  typeof listWorkPlacementsQuerySchema
>;

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export type CreateCompanyTutorInput = z.infer<typeof createCompanyTutorSchema>;

export type UpdateCompanyTutorInput = z.infer<typeof updateCompanyTutorSchema>;

export type CreateWorkPlacementInput = z.infer<
  typeof createWorkPlacementSchema
>;

export type UpdateWorkPlacementInput = z.infer<
  typeof updateWorkPlacementSchema
>;

export type CreatePlacementFollowupInput = z.infer<
  typeof createPlacementFollowupSchema
>;

export type UpdatePlacementFollowupInput = z.infer<
  typeof updatePlacementFollowupSchema
>;

export type CreatePlacementIncidentInput = z.infer<
  typeof createPlacementIncidentSchema
>;

export type UpdatePlacementIncidentInput = z.infer<
  typeof updatePlacementIncidentSchema
>;
