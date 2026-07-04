import {
  Router,
  type Request,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  createVocationalProgrammeSchema,
  listProgrammeCentresQuerySchema,
  listVocationalProgrammesQuerySchema,
  programmeCentreParamsSchema,
  updateVocationalProgrammeSchema,
  vocationalProgrammeIdParamsSchema,
} from './vocational-programmes.schemas.js';

import {
  archiveProgrammeCentreAssociation,
  archiveVocationalProgramme,
  associateProgrammeWithCentre,
  AssociationCentreNotFoundError,
  AssociationCentreUnavailableError,
  CentreProgrammeAssociationAlreadyArchivedError,
  CentreProgrammeAssociationHasActiveOfferingsError,
  CentreProgrammeAssociationNotFoundError,
  createVocationalProgramme,
  getVocationalProgrammeById,
  listProgrammeCentres,
  listVocationalProgrammes,
  restoreVocationalProgramme,
  updateVocationalProgramme,
  VocationalProgrammeAcronymAlreadyExistsError,
  VocationalProgrammeAlreadyArchivedError,
  VocationalProgrammeArchivedError,
  VocationalProgrammeCodeAlreadyExistsError,
  VocationalProgrammeHasActiveModulesError,
  VocationalProgrammeHasActiveOfferingsError,
  VocationalProgrammeIdentifierConflictError,
  VocationalProgrammeNotArchivedError,
  VocationalProgrammeNotFoundError,
  VocationalProgrammeUnavailableError,
} from './vocational-programmes.service.js';

export const vocationalProgrammesRouter =
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

function getValidatedProgrammeId(
  request: Request,
  response: Response,
): number | null {
  const validation =
    vocationalProgrammeIdParamsSchema
      .safeParse(request.params);

  if (!validation.success) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',

        message:
          'El identificador del ciclo formativo no es válido.',

        details: getValidationDetails(
          validation.error.issues,
        ),
      },
    });

    return null;
  }

  return validation.data.id;
}

function getValidatedAssociationIds(
  request: Request,
  response: Response,
): {
  vocationalProgrammeId: number;
  centreId: number;
} | null {
  const validation =
    programmeCentreParamsSchema.safeParse(
      request.params,
    );

  if (!validation.success) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',

        message:
          'Los identificadores del ciclo o del centro no son válidos.',

        details: getValidationDetails(
          validation.error.issues,
        ),
      },
    });

    return null;
  }

  return {
    vocationalProgrammeId:
      validation.data.id,

    centreId:
      validation.data.centreId,
  };
}

function handleKnownProgrammeError(
  error: unknown,
  response: Response,
): boolean {
  if (
    error
    instanceof VocationalProgrammeCodeAlreadyExistsError
  ) {
    response.status(409).json({
      error: {
        code:
          'VOCATIONAL_PROGRAMME_CODE_ALREADY_EXISTS',

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
    error
    instanceof VocationalProgrammeAcronymAlreadyExistsError
  ) {
    response.status(409).json({
      error: {
        code:
          'VOCATIONAL_PROGRAMME_ACRONYM_ALREADY_EXISTS',

        message: error.message,

        details: [
          {
            field: 'acronym',
            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof VocationalProgrammeIdentifierConflictError
  ) {
    response.status(409).json({
      error: {
        code:
          'VOCATIONAL_PROGRAMME_IDENTIFIER_CONFLICT',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof VocationalProgrammeNotFoundError
  ) {
    response.status(404).json({
      error: {
        code:
          'VOCATIONAL_PROGRAMME_NOT_FOUND',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof VocationalProgrammeArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'VOCATIONAL_PROGRAMME_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof VocationalProgrammeAlreadyArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'VOCATIONAL_PROGRAMME_ALREADY_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof VocationalProgrammeNotArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'VOCATIONAL_PROGRAMME_NOT_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof VocationalProgrammeUnavailableError
  ) {
    response.status(409).json({
      error: {
        code:
          'VOCATIONAL_PROGRAMME_UNAVAILABLE',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof VocationalProgrammeHasActiveOfferingsError
  ) {
    response.status(409).json({
      error: {
        code:
          'VOCATIONAL_PROGRAMME_HAS_ACTIVE_OFFERINGS',

        message: error.message,

        details: [
          {
            field: 'isActive',

            message:
              `El ciclo tiene ${error.activeOfferingCount} oferta u ofertas académicas activas.`,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof VocationalProgrammeHasActiveModulesError
  ) {
    response.status(409).json({
      error: {
        code:
          'VOCATIONAL_PROGRAMME_HAS_ACTIVE_MODULES',

        message: error.message,

        details: [
          {
            field: 'modules',

            message:
              `El ciclo tiene ${error.activeModuleCount} módulo o módulos activos.`,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof AssociationCentreNotFoundError
  ) {
    response.status(404).json({
      error: {
        code:
          'ASSOCIATION_CENTRE_NOT_FOUND',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof AssociationCentreUnavailableError
  ) {
    response.status(409).json({
      error: {
        code:
          'ASSOCIATION_CENTRE_UNAVAILABLE',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof CentreProgrammeAssociationNotFoundError
  ) {
    response.status(404).json({
      error: {
        code:
          'CENTRE_PROGRAMME_ASSOCIATION_NOT_FOUND',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof CentreProgrammeAssociationAlreadyArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'CENTRE_PROGRAMME_ASSOCIATION_ALREADY_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof CentreProgrammeAssociationHasActiveOfferingsError
  ) {
    response.status(409).json({
      error: {
        code:
          'CENTRE_PROGRAMME_ASSOCIATION_HAS_ACTIVE_OFFERINGS',

        message: error.message,

        details: [
          {
            field: 'association',

            message:
              `La asociación tiene ${error.activeOfferingCount} oferta u ofertas activas.`,
          },
        ],
      },
    });

    return true;
  }

  return false;
}

vocationalProgrammesRouter.get(
  '/',
  requirePermission(
    'vocational-programmes.list',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        listVocationalProgrammesQuerySchema
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
        await listVocationalProgrammes(
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

vocationalProgrammesRouter.post(
  '/',
  requirePermission(
    'vocational-programmes.create',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        createVocationalProgrammeSchema
          .safeParse(request.body);

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos del ciclo formativo no son válidos.',

            details:
              getValidationDetails(
                validation.error.issues,
              ),
          },
        });

        return;
      }

      const vocationalProgramme =
        await createVocationalProgramme(
          validation.data,
        );

      response.status(201).json({
        message:
          'El ciclo formativo se ha creado correctamente.',

        vocationalProgramme,
      });
    } catch (error: unknown) {
      if (
        handleKnownProgrammeError(
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

vocationalProgrammesRouter.post(
  '/:id/restore',
  requirePermission(
    'vocational-programmes.archive',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const vocationalProgrammeId =
        getValidatedProgrammeId(
          request,
          response,
        );

      if (
        vocationalProgrammeId === null
      ) {
        return;
      }

      const vocationalProgramme =
        await restoreVocationalProgramme(
          vocationalProgrammeId,
        );

      response.status(200).json({
        message:
          'El ciclo formativo se ha restaurado correctamente.',

        vocationalProgramme,
      });
    } catch (error: unknown) {
      if (
        handleKnownProgrammeError(
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

vocationalProgrammesRouter.get(
  '/:id/centres',
  requirePermission(
    'vocational-programmes.view',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const vocationalProgrammeId =
        getValidatedProgrammeId(
          request,
          response,
        );

      if (
        vocationalProgrammeId === null
      ) {
        return;
      }

      const validation =
        listProgrammeCentresQuerySchema
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
        await listProgrammeCentres(
          vocationalProgrammeId,
          validation.data,
        );

      response
        .status(200)
        .json(result);
    } catch (error: unknown) {
      if (
        handleKnownProgrammeError(
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

vocationalProgrammesRouter.post(
  '/:id/centres/:centreId',
  requirePermission(
    'vocational-programmes.update',
  ),
  requirePermission(
    'centres.view',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const identifiers =
        getValidatedAssociationIds(
          request,
          response,
        );

      if (identifiers === null) {
        return;
      }

      const association =
        await associateProgrammeWithCentre(
          identifiers
            .vocationalProgrammeId,

          identifiers.centreId,
        );

      response.status(200).json({
        message:
          'El ciclo se ha asociado al centro correctamente.',

        association,
      });
    } catch (error: unknown) {
      if (
        handleKnownProgrammeError(
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

vocationalProgrammesRouter.delete(
  '/:id/centres/:centreId',
  requirePermission(
    'vocational-programmes.update',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const identifiers =
        getValidatedAssociationIds(
          request,
          response,
        );

      if (identifiers === null) {
        return;
      }

      const association =
        await archiveProgrammeCentreAssociation(
          identifiers
            .vocationalProgrammeId,

          identifiers.centreId,
        );

      response.status(200).json({
        message:
          'La asociación entre el ciclo y el centro se ha archivado correctamente.',

        association,
      });
    } catch (error: unknown) {
      if (
        handleKnownProgrammeError(
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

vocationalProgrammesRouter.get(
  '/:id',
  requirePermission(
    'vocational-programmes.view',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const vocationalProgrammeId =
        getValidatedProgrammeId(
          request,
          response,
        );

      if (
        vocationalProgrammeId === null
      ) {
        return;
      }

      const vocationalProgramme =
        await getVocationalProgrammeById(
          vocationalProgrammeId,
        );

      response.status(200).json({
        vocationalProgramme,
      });
    } catch (error: unknown) {
      if (
        handleKnownProgrammeError(
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

vocationalProgrammesRouter.put(
  '/:id',
  requirePermission(
    'vocational-programmes.update',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const vocationalProgrammeId =
        getValidatedProgrammeId(
          request,
          response,
        );

      if (
        vocationalProgrammeId === null
      ) {
        return;
      }

      const validation =
        updateVocationalProgrammeSchema
          .safeParse(request.body);

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos del ciclo formativo no son válidos.',

            details:
              getValidationDetails(
                validation.error.issues,
              ),
          },
        });

        return;
      }

      const vocationalProgramme =
        await updateVocationalProgramme(
          vocationalProgrammeId,
          validation.data,
        );

      response.status(200).json({
        message:
          'El ciclo formativo se ha actualizado correctamente.',

        vocationalProgramme,
      });
    } catch (error: unknown) {
      if (
        handleKnownProgrammeError(
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

vocationalProgrammesRouter.delete(
  '/:id',
  requirePermission(
    'vocational-programmes.archive',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const vocationalProgrammeId =
        getValidatedProgrammeId(
          request,
          response,
        );

      if (
        vocationalProgrammeId === null
      ) {
        return;
      }

      const vocationalProgramme =
        await archiveVocationalProgramme(
          vocationalProgrammeId,
        );

      response.status(200).json({
        message:
          'El ciclo formativo se ha archivado correctamente.',

        vocationalProgramme,
      });
    } catch (error: unknown) {
      if (
        handleKnownProgrammeError(
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