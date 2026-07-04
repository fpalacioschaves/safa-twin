import {
  Router,
  type Request,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  academicOfferingIdParamsSchema,
  createAcademicOfferingSchema,
  listAcademicOfferingsQuerySchema,
  updateAcademicOfferingSchema,
} from './academic-offerings.schemas.js';

import {
  AcademicOfferingAlreadyArchivedError,
  AcademicOfferingAlreadyExistsError,
  AcademicOfferingArchivedError,
  AcademicOfferingAssignmentChangeRequiresInactiveError,
  AcademicOfferingNotArchivedError,
  AcademicOfferingNotFoundError,
  archiveAcademicOffering,
  createAcademicOffering,
  getAcademicOfferingById,
  listAcademicOfferings,
  OfferingAcademicLevelNotFoundError,
  OfferingAcademicLevelUnavailableError,
  OfferingAcademicYearNotFoundError,
  OfferingAcademicYearUnavailableError,
  OfferingCentreNotFoundError,
  OfferingCentreProgrammeNotFoundError,
  OfferingCentreProgrammeUnavailableError,
  OfferingCentreUnavailableError,
  OfferingProgrammeNotFoundError,
  OfferingProgrammeUnavailableError,
  restoreAcademicOffering,
  updateAcademicOffering,
} from './academic-offerings.service.js';

export const academicOfferingsRouter =
  Router();

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

function getValidatedAcademicOfferingId(
  request: Request,
  response: Response,
): number | null {
  const validation =
    academicOfferingIdParamsSchema
      .safeParse(request.params);

  if (!validation.success) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',

        message:
          'El identificador de la oferta académica no es válido.',

        details:
          getValidationDetails(
            validation.error.issues,
          ),
      },
    });

    return null;
  }

  return validation.data.id;
}

function handleKnownAcademicOfferingError(
  error: unknown,
  response: Response,
): boolean {
  if (
    error
    instanceof AcademicOfferingAlreadyExistsError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_OFFERING_ALREADY_EXISTS',

        message: error.message,

        details: [
          {
            field: 'academicOffering',

            message:
              error.existingOfferingIsArchived
                ? `La oferta archivada tiene el identificador ${error.existingOfferingId}.`
                : `La oferta existente tiene el identificador ${error.existingOfferingId}.`,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicOfferingNotFoundError
  ) {
    response.status(404).json({
      error: {
        code:
          'ACADEMIC_OFFERING_NOT_FOUND',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicOfferingArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_OFFERING_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicOfferingAlreadyArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_OFFERING_ALREADY_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicOfferingNotArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_OFFERING_NOT_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicOfferingAssignmentChangeRequiresInactiveError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_OFFERING_ASSIGNMENT_CHANGE_REQUIRES_INACTIVE',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof OfferingAcademicYearNotFoundError
  ) {
    response.status(422).json({
      error: {
        code:
          'OFFERING_ACADEMIC_YEAR_NOT_FOUND',

        message: error.message,

        details: [
          {
            field: 'academicYearId',
            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof OfferingAcademicYearUnavailableError
  ) {
    response.status(409).json({
      error: {
        code:
          'OFFERING_ACADEMIC_YEAR_UNAVAILABLE',

        message: error.message,

        details: [
          {
            field: 'academicYearId',
            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof OfferingCentreNotFoundError
  ) {
    response.status(422).json({
      error: {
        code:
          'OFFERING_CENTRE_NOT_FOUND',

        message: error.message,

        details: [
          {
            field: 'centreId',
            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof OfferingCentreUnavailableError
  ) {
    response.status(409).json({
      error: {
        code:
          'OFFERING_CENTRE_UNAVAILABLE',

        message: error.message,

        details: [
          {
            field: 'centreId',
            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof OfferingProgrammeNotFoundError
  ) {
    response.status(422).json({
      error: {
        code:
          'OFFERING_PROGRAMME_NOT_FOUND',

        message: error.message,

        details: [
          {
            field:
              'vocationalProgrammeId',

            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof OfferingProgrammeUnavailableError
  ) {
    response.status(409).json({
      error: {
        code:
          'OFFERING_PROGRAMME_UNAVAILABLE',

        message: error.message,

        details: [
          {
            field:
              'vocationalProgrammeId',

            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof OfferingAcademicLevelNotFoundError
  ) {
    response.status(422).json({
      error: {
        code:
          'OFFERING_ACADEMIC_LEVEL_NOT_FOUND',

        message: error.message,

        details: [
          {
            field:
              'academicLevelId',

            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof OfferingAcademicLevelUnavailableError
  ) {
    response.status(409).json({
      error: {
        code:
          'OFFERING_ACADEMIC_LEVEL_UNAVAILABLE',

        message: error.message,

        details: [
          {
            field:
              'academicLevelId',

            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof OfferingCentreProgrammeNotFoundError
  ) {
    response.status(422).json({
      error: {
        code:
          'OFFERING_CENTRE_PROGRAMME_NOT_FOUND',

        message: error.message,

        details: [
          {
            field:
              'vocationalProgrammeId',

            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof OfferingCentreProgrammeUnavailableError
  ) {
    response.status(409).json({
      error: {
        code:
          'OFFERING_CENTRE_PROGRAMME_UNAVAILABLE',

        message: error.message,

        details: [
          {
            field:
              'vocationalProgrammeId',

            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  return false;
}

academicOfferingsRouter.get(
  '/',
  requirePermission(
    'academic-offerings.list',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        listAcademicOfferingsQuerySchema
          .safeParse(request.query);

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los filtros enviados no son válidos.',

            details:
              getValidationDetails(
                validation.error.issues,
              ),
          },
        });

        return;
      }

      const result =
        await listAcademicOfferings(
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

academicOfferingsRouter.post(
  '/',
  requirePermission(
    'academic-offerings.create',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        createAcademicOfferingSchema
          .safeParse(request.body);

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos de la oferta académica no son válidos.',

            details:
              getValidationDetails(
                validation.error.issues,
              ),
          },
        });

        return;
      }

      const academicOffering =
        await createAcademicOffering(
          validation.data,
        );

      response.status(201).json({
        message:
          'La oferta académica se ha creado correctamente.',

        academicOffering,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicOfferingError(
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

academicOfferingsRouter.post(
  '/:id/restore',
  requirePermission(
    'academic-offerings.archive',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const academicOfferingId =
        getValidatedAcademicOfferingId(
          request,
          response,
        );

      if (
        academicOfferingId === null
      ) {
        return;
      }

      const academicOffering =
        await restoreAcademicOffering(
          academicOfferingId,
        );

      response.status(200).json({
        message:
          'La oferta académica se ha restaurado correctamente.',

        academicOffering,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicOfferingError(
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

academicOfferingsRouter.get(
  '/:id',
  requirePermission(
    'academic-offerings.view',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const academicOfferingId =
        getValidatedAcademicOfferingId(
          request,
          response,
        );

      if (
        academicOfferingId === null
      ) {
        return;
      }

      const academicOffering =
        await getAcademicOfferingById(
          academicOfferingId,
        );

      response.status(200).json({
        academicOffering,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicOfferingError(
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

academicOfferingsRouter.put(
  '/:id',
  requirePermission(
    'academic-offerings.update',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const academicOfferingId =
        getValidatedAcademicOfferingId(
          request,
          response,
        );

      if (
        academicOfferingId === null
      ) {
        return;
      }

      const validation =
        updateAcademicOfferingSchema
          .safeParse(request.body);

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos de la oferta académica no son válidos.',

            details:
              getValidationDetails(
                validation.error.issues,
              ),
          },
        });

        return;
      }

      const academicOffering =
        await updateAcademicOffering(
          academicOfferingId,
          validation.data,
        );

      response.status(200).json({
        message:
          'La oferta académica se ha actualizado correctamente.',

        academicOffering,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicOfferingError(
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

academicOfferingsRouter.delete(
  '/:id',
  requirePermission(
    'academic-offerings.archive',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const academicOfferingId =
        getValidatedAcademicOfferingId(
          request,
          response,
        );

      if (
        academicOfferingId === null
      ) {
        return;
      }

      const academicOffering =
        await archiveAcademicOffering(
          academicOfferingId,
        );

      response.status(200).json({
        message:
          'La oferta académica se ha archivado correctamente.',

        academicOffering,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicOfferingError(
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