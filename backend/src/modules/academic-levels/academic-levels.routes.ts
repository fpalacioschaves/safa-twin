import {
  Router,
  type Request,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  academicLevelIdParamsSchema,
  createAcademicLevelSchema,
  listAcademicLevelsQuerySchema,
  updateAcademicLevelSchema,
} from './academic-levels.schemas.js';

import {
  AcademicLevelAlreadyArchivedError,
  AcademicLevelArchivedError,
  AcademicLevelHasActiveModulesError,
  AcademicLevelHasActiveOfferingsError,
  AcademicLevelIdentifierConflictError,
  AcademicLevelNameAlreadyExistsError,
  AcademicLevelNotArchivedError,
  AcademicLevelNotFoundError,
  AcademicLevelNumberAlreadyExistsError,
  archiveAcademicLevel,
  createAcademicLevel,
  getAcademicLevelById,
  listAcademicLevels,
  restoreAcademicLevel,
  updateAcademicLevel,
} from './academic-levels.service.js';

export const academicLevelsRouter =
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

function getValidatedAcademicLevelId(
  request: Request,
  response: Response,
): number | null {
  const validation =
    academicLevelIdParamsSchema.safeParse(
      request.params,
    );

  if (!validation.success) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',

        message:
          'El identificador del nivel académico no es válido.',

        details: getValidationDetails(
          validation.error.issues,
        ),
      },
    });

    return null;
  }

  return validation.data.id;
}

function handleKnownAcademicLevelError(
  error: unknown,
  response: Response,
): boolean {
  if (
    error
    instanceof AcademicLevelNumberAlreadyExistsError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_LEVEL_NUMBER_ALREADY_EXISTS',

        message: error.message,

        details: [
          {
            field: 'number',
            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicLevelNameAlreadyExistsError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_LEVEL_NAME_ALREADY_EXISTS',

        message: error.message,

        details: [
          {
            field: 'name',
            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicLevelIdentifierConflictError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_LEVEL_IDENTIFIER_CONFLICT',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicLevelNotFoundError
  ) {
    response.status(404).json({
      error: {
        code:
          'ACADEMIC_LEVEL_NOT_FOUND',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicLevelArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_LEVEL_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicLevelAlreadyArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_LEVEL_ALREADY_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicLevelNotArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_LEVEL_NOT_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicLevelHasActiveModulesError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_LEVEL_HAS_ACTIVE_MODULES',

        message: error.message,

        details: [
          {
            field: 'modules',

            message:
              `El nivel tiene ${error.activeModuleCount} módulo o módulos activos.`,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicLevelHasActiveOfferingsError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_LEVEL_HAS_ACTIVE_OFFERINGS',

        message: error.message,

        details: [
          {
            field: 'academicOfferings',

            message:
              `El nivel tiene ${error.activeOfferingCount} oferta u ofertas académicas activas.`,
          },
        ],
      },
    });

    return true;
  }

  return false;
}

academicLevelsRouter.get(
  '/',
  requirePermission(
    'academic-levels.list',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        listAcademicLevelsQuerySchema
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
        await listAcademicLevels(
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

academicLevelsRouter.post(
  '/',
  requirePermission(
    'academic-levels.create',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        createAcademicLevelSchema.safeParse(
          request.body,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos del nivel académico no son válidos.',

            details:
              getValidationDetails(
                validation.error.issues,
              ),
          },
        });

        return;
      }

      const academicLevel =
        await createAcademicLevel(
          validation.data,
        );

      response.status(201).json({
        message:
          'El nivel académico se ha creado correctamente.',

        academicLevel,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicLevelError(
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

academicLevelsRouter.post(
  '/:id/restore',
  requirePermission(
    'academic-levels.archive',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const academicLevelId =
        getValidatedAcademicLevelId(
          request,
          response,
        );

      if (academicLevelId === null) {
        return;
      }

      const academicLevel =
        await restoreAcademicLevel(
          academicLevelId,
        );

      response.status(200).json({
        message:
          'El nivel académico se ha restaurado correctamente.',

        academicLevel,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicLevelError(
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

academicLevelsRouter.get(
  '/:id',
  requirePermission(
    'academic-levels.view',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const academicLevelId =
        getValidatedAcademicLevelId(
          request,
          response,
        );

      if (academicLevelId === null) {
        return;
      }

      const academicLevel =
        await getAcademicLevelById(
          academicLevelId,
        );

      response.status(200).json({
        academicLevel,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicLevelError(
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

academicLevelsRouter.put(
  '/:id',
  requirePermission(
    'academic-levels.update',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const academicLevelId =
        getValidatedAcademicLevelId(
          request,
          response,
        );

      if (academicLevelId === null) {
        return;
      }

      const validation =
        updateAcademicLevelSchema.safeParse(
          request.body,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos del nivel académico no son válidos.',

            details:
              getValidationDetails(
                validation.error.issues,
              ),
          },
        });

        return;
      }

      const academicLevel =
        await updateAcademicLevel(
          academicLevelId,
          validation.data,
        );

      response.status(200).json({
        message:
          'El nivel académico se ha actualizado correctamente.',

        academicLevel,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicLevelError(
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

academicLevelsRouter.delete(
  '/:id',
  requirePermission(
    'academic-levels.archive',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const academicLevelId =
        getValidatedAcademicLevelId(
          request,
          response,
        );

      if (academicLevelId === null) {
        return;
      }

      const academicLevel =
        await archiveAcademicLevel(
          academicLevelId,
        );

      response.status(200).json({
        message:
          'El nivel académico se ha archivado correctamente.',

        academicLevel,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicLevelError(
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