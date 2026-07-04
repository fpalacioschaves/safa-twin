import {
  Router,
  type Request,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  centreIdParamsSchema,
  createCentreSchema,
  listCentresQuerySchema,
  updateCentreSchema,
} from './centres.schemas.js';

import {
  archiveCentre,
  CentreAlreadyArchivedError,
  CentreArchivedError,
  CentreCodeAlreadyExistsError,
  CentreHasActiveAcademicOfferingsError,
  CentreNotArchivedError,
  CentreNotFoundError,
  createCentre,
  getCentreById,
  listCentres,
  restoreCentre,
  updateCentre,
} from './centres.service.js';

export const centresRouter = Router();

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

function getValidatedCentreId(
  request: Request,
  response: Response,
): number | null {
  const validation =
    centreIdParamsSchema.safeParse(
      request.params,
    );

  if (!validation.success) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',

        message:
          'El identificador del centro no es válido.',

        details: getValidationDetails(
          validation.error.issues,
        ),
      },
    });

    return null;
  }

  return validation.data.id;
}

function handleKnownCentreError(
  error: unknown,
  response: Response,
): boolean {
  if (
    error
    instanceof CentreCodeAlreadyExistsError
  ) {
    response.status(409).json({
      error: {
        code:
          'CENTRE_CODE_ALREADY_EXISTS',

        message: error.message,

        details: [
          {
            field: 'code',
            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error instanceof CentreNotFoundError
  ) {
    response.status(404).json({
      error: {
        code: 'CENTRE_NOT_FOUND',
        message: error.message,
      },
    });

    return true;
  }

  if (
    error instanceof CentreArchivedError
  ) {
    response.status(409).json({
      error: {
        code: 'CENTRE_ARCHIVED',
        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof CentreAlreadyArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'CENTRE_ALREADY_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error instanceof CentreNotArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'CENTRE_NOT_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof CentreHasActiveAcademicOfferingsError
  ) {
    response.status(409).json({
      error: {
        code:
          'CENTRE_HAS_ACTIVE_ACADEMIC_OFFERINGS',

        message: error.message,

        details: [
          {
            field: 'isActive',

            message:
              `El centro tiene ${error.activeOfferingCount} oferta u ofertas académicas activas.`,
          },
        ],
      },
    });

    return true;
  }

  return false;
}

centresRouter.get(
  '/',
  requirePermission('centres.list'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        listCentresQuerySchema.safeParse(
          request.query,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los filtros enviados no son válidos.',

            details: getValidationDetails(
              validation.error.issues,
            ),
          },
        });

        return;
      }

      const result = await listCentres(
        validation.data,
      );

      response
        .status(200)
        .json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);

centresRouter.post(
  '/',
  requirePermission('centres.create'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        createCentreSchema.safeParse(
          request.body,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos del centro no son válidos.',

            details: getValidationDetails(
              validation.error.issues,
            ),
          },
        });

        return;
      }

      const centre = await createCentre(
        validation.data,
      );

      response.status(201).json({
        message:
          'El centro se ha creado correctamente.',

        centre,
      });
    } catch (error: unknown) {
      if (
        handleKnownCentreError(
          error,
          response,
        )
      ) {
        return;
      }

      next(error);
    }
  },
);

centresRouter.post(
  '/:id/restore',
  requirePermission('centres.archive'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const centreId =
        getValidatedCentreId(
          request,
          response,
        );

      if (centreId === null) {
        return;
      }

      const centre = await restoreCentre(
        centreId,
      );

      response.status(200).json({
        message:
          'El centro se ha restaurado correctamente.',

        centre,
      });
    } catch (error: unknown) {
      if (
        handleKnownCentreError(
          error,
          response,
        )
      ) {
        return;
      }

      next(error);
    }
  },
);

centresRouter.get(
  '/:id',
  requirePermission('centres.view'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const centreId =
        getValidatedCentreId(
          request,
          response,
        );

      if (centreId === null) {
        return;
      }

      const centre = await getCentreById(
        centreId,
      );

      response.status(200).json({
        centre,
      });
    } catch (error: unknown) {
      if (
        handleKnownCentreError(
          error,
          response,
        )
      ) {
        return;
      }

      next(error);
    }
  },
);

centresRouter.put(
  '/:id',
  requirePermission('centres.update'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const centreId =
        getValidatedCentreId(
          request,
          response,
        );

      if (centreId === null) {
        return;
      }

      const validation =
        updateCentreSchema.safeParse(
          request.body,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos del centro no son válidos.',

            details: getValidationDetails(
              validation.error.issues,
            ),
          },
        });

        return;
      }

      const centre = await updateCentre(
        centreId,
        validation.data,
      );

      response.status(200).json({
        message:
          'El centro se ha actualizado correctamente.',

        centre,
      });
    } catch (error: unknown) {
      if (
        handleKnownCentreError(
          error,
          response,
        )
      ) {
        return;
      }

      next(error);
    }
  },
);

centresRouter.delete(
  '/:id',
  requirePermission('centres.archive'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const centreId =
        getValidatedCentreId(
          request,
          response,
        );

      if (centreId === null) {
        return;
      }

      const centre = await archiveCentre(
        centreId,
      );

      response.status(200).json({
        message:
          'El centro se ha archivado correctamente.',

        centre,
      });
    } catch (error: unknown) {
      if (
        handleKnownCentreError(
          error,
          response,
        )
      ) {
        return;
      }

      next(error);
    }
  },
);