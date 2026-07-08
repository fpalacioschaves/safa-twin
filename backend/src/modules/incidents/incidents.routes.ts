import {
  Router,
  type Request,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  createIncidentSchema,
  incidentIdParamsSchema,
  incidentSummaryQuerySchema,
  listIncidentsQuerySchema,
  updateIncidentSchema,
} from './incidents.schemas.js';

import {
  archiveIncident,
  createIncident,
  getIncidentById,
  getIncidentsSummary,
  IncidentAlreadyArchivedError,
  IncidentArchivedError,
  IncidentNotFoundError,
  IncidentRelatedEntityUnavailableError,
  listIncidents,
  updateIncident,
} from './incidents.service.js';

export const incidentsRouter = Router();

function getValidationDetails(
  issues: {
    path: PropertyKey[];
    message: string;
  }[],
) {
  return issues.map((issue) => ({
    field: issue.path
      .map(String)
      .join('.'),
    message: issue.message,
  }));
}

function sendValidationError(
  response: Response,
  message: string,
  issues: {
    path: PropertyKey[];
    message: string;
  }[],
): void {
  response.status(422).json({
    error: {
      code: 'VALIDATION_ERROR',
      message,
      details: getValidationDetails(issues),
    },
  });
}

function getValidatedIncidentId(
  request: Request,
  response: Response,
): number | null {
  const validation = incidentIdParamsSchema.safeParse(
    request.params,
  );

  if (!validation.success) {
    sendValidationError(
      response,
      'El identificador de la incidencia no es válido.',
      validation.error.issues,
    );

    return null;
  }

  return validation.data.id;
}

function getAuthenticatedUserId(
  response: Response,
): number | null {
  const authenticatedUser = response.locals.authenticatedUser as
    | { id?: number }
    | undefined;

  return authenticatedUser?.id ?? null;
}

function handleKnownIncidentError(
  error: unknown,
  response: Response,
): boolean {
  if (error instanceof IncidentNotFoundError) {
    response.status(404).json({
      error: {
        code: 'INCIDENT_NOT_FOUND',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof IncidentArchivedError) {
    response.status(409).json({
      error: {
        code: 'INCIDENT_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof IncidentAlreadyArchivedError) {
    response.status(409).json({
      error: {
        code: 'INCIDENT_ALREADY_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof IncidentRelatedEntityUnavailableError) {
    response.status(422).json({
      error: {
        code: 'INCIDENT_RELATED_ENTITY_UNAVAILABLE',
        message: error.message,
      },
    });
    return true;
  }

  return false;
}

incidentsRouter.get(
  '/',
  requirePermission('incidents.view'),
  async (request, response, next) => {
    const validation = listIncidentsQuerySchema.safeParse(
      request.query,
    );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los filtros de incidencias no son válidos.',
        validation.error.issues,
      );
      return;
    }

    try {
      response.status(200).json(
        await listIncidents(validation.data),
      );
    } catch (error: unknown) {
      next(error);
    }
  },
);

incidentsRouter.get(
  '/summary',
  requirePermission('incidents.view'),
  async (request, response, next) => {
    const validation = incidentSummaryQuerySchema.safeParse(
      request.query,
    );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los filtros del resumen de incidencias no son válidos.',
        validation.error.issues,
      );
      return;
    }

    try {
      response.status(200).json(
        await getIncidentsSummary(validation.data),
      );
    } catch (error: unknown) {
      next(error);
    }
  },
);

incidentsRouter.get(
  '/:id',
  requirePermission('incidents.view'),
  async (request, response, next) => {
    const incidentId = getValidatedIncidentId(
      request,
      response,
    );

    if (incidentId === null) {
      return;
    }

    try {
      response.status(200).json({
        incident: await getIncidentById(incidentId),
      });
    } catch (error: unknown) {
      if (handleKnownIncidentError(error, response)) {
        return;
      }

      next(error);
    }
  },
);

incidentsRouter.post(
  '/',
  requirePermission('incidents.manage'),
  async (request, response, next) => {
    const validation = createIncidentSchema.safeParse(
      request.body,
    );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los datos de la incidencia no son válidos.',
        validation.error.issues,
      );
      return;
    }

    try {
      response.status(201).json({
        incident: await createIncident(
          validation.data,
          getAuthenticatedUserId(response),
        ),
      });
    } catch (error: unknown) {
      if (handleKnownIncidentError(error, response)) {
        return;
      }

      next(error);
    }
  },
);

incidentsRouter.put(
  '/:id',
  requirePermission('incidents.manage'),
  async (request, response, next) => {
    const incidentId = getValidatedIncidentId(
      request,
      response,
    );

    if (incidentId === null) {
      return;
    }

    const validation = updateIncidentSchema.safeParse(
      request.body,
    );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los datos de la incidencia no son válidos.',
        validation.error.issues,
      );
      return;
    }

    try {
      response.status(200).json({
        incident: await updateIncident(
          incidentId,
          validation.data,
        ),
      });
    } catch (error: unknown) {
      if (handleKnownIncidentError(error, response)) {
        return;
      }

      next(error);
    }
  },
);

incidentsRouter.delete(
  '/:id',
  requirePermission('incidents.manage'),
  async (request, response, next) => {
    const incidentId = getValidatedIncidentId(
      request,
      response,
    );

    if (incidentId === null) {
      return;
    }

    try {
      response.status(200).json(
        await archiveIncident(incidentId),
      );
    } catch (error: unknown) {
      if (handleKnownIncidentError(error, response)) {
        return;
      }

      next(error);
    }
  },
);
