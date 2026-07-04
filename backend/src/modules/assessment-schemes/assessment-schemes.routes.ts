import {
  Router,
  type Request,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  assessmentSchemeIdParamsSchema,
  createAssessmentSchemeSchema,
  listAssessmentSchemesQuerySchema,
  updateAssessmentSchemeSchema,
} from './assessment-schemes.schemas.js';

import {
  archiveAssessmentScheme,
  AssessmentSchemeAlreadyArchivedError,
  AssessmentSchemeAlreadyExistsError,
  AssessmentSchemeArchivedError,
  AssessmentSchemeInvalidComponentsError,
  AssessmentSchemeNotArchivedError,
  AssessmentSchemeNotFoundError,
  AssessmentSchemeRelatedEntityUnavailableError,
  createAssessmentScheme,
  getAssessmentSchemeById,
  listAssessmentSchemes,
  restoreAssessmentScheme,
  updateAssessmentScheme,
} from './assessment-schemes.service.js';

export const assessmentSchemesRouter =
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

function getValidatedAssessmentSchemeId(
  request: Request,
  response: Response,
): number | null {
  const validation =
    assessmentSchemeIdParamsSchema.safeParse(
      request.params,
    );

  if (!validation.success) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message:
          'El identificador del sistema de calificación no es válido.',
        details: getValidationDetails(
          validation.error.issues,
        ),
      },
    });

    return null;
  }

  return validation.data.id;
}

function handleKnownAssessmentSchemeError(
  error: unknown,
  response: Response,
): boolean {
  if (
    error instanceof AssessmentSchemeAlreadyExistsError
  ) {
    response.status(409).json({
      error: {
        code:
          'ASSESSMENT_SCHEME_ALREADY_EXISTS',
        message: error.message,
      },
    });
    return true;
  }

  if (
    error instanceof AssessmentSchemeNotFoundError
  ) {
    response.status(404).json({
      error: {
        code: 'ASSESSMENT_SCHEME_NOT_FOUND',
        message: error.message,
      },
    });
    return true;
  }

  if (
    error instanceof AssessmentSchemeArchivedError
  ) {
    response.status(409).json({
      error: {
        code: 'ASSESSMENT_SCHEME_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  if (
    error instanceof AssessmentSchemeAlreadyArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'ASSESSMENT_SCHEME_ALREADY_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  if (
    error instanceof AssessmentSchemeNotArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'ASSESSMENT_SCHEME_NOT_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  if (
    error
    instanceof AssessmentSchemeRelatedEntityUnavailableError
  ) {
    response.status(422).json({
      error: {
        code:
          'ASSESSMENT_SCHEME_RELATED_ENTITY_UNAVAILABLE',
        message: error.message,
      },
    });
    return true;
  }

  if (
    error
    instanceof AssessmentSchemeInvalidComponentsError
  ) {
    response.status(422).json({
      error: {
        code:
          'ASSESSMENT_SCHEME_INVALID_COMPONENTS',
        message: error.message,
      },
    });
    return true;
  }

  return false;
}

assessmentSchemesRouter.get(
  '/',
  requirePermission('evaluations.list'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      listAssessmentSchemesQuerySchema.safeParse(
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

    try {
      const result =
        await listAssessmentSchemes(
          validation.data,
        );

      response.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);

assessmentSchemesRouter.get(
  '/:id',
  requirePermission('evaluations.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const assessmentSchemeId =
      getValidatedAssessmentSchemeId(
        request,
        response,
      );

    if (!assessmentSchemeId) {
      return;
    }

    try {
      const assessmentScheme =
        await getAssessmentSchemeById(
          assessmentSchemeId,
        );

      response.status(200).json({
        assessmentScheme,
      });
    } catch (error: unknown) {
      if (
        handleKnownAssessmentSchemeError(
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

assessmentSchemesRouter.post(
  '/',
  requirePermission('evaluations.create'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      createAssessmentSchemeSchema.safeParse(
        request.body,
      );

    if (!validation.success) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message:
            'Los datos del sistema de calificación no son válidos.',
          details: getValidationDetails(
            validation.error.issues,
          ),
        },
      });

      return;
    }

    try {
      const assessmentScheme =
        await createAssessmentScheme(
          validation.data,
        );

      response.status(201).json({
        message:
          'Sistema de calificación creado correctamente.',
        assessmentScheme,
      });
    } catch (error: unknown) {
      if (
        handleKnownAssessmentSchemeError(
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

assessmentSchemesRouter.put(
  '/:id',
  requirePermission('evaluations.update'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const assessmentSchemeId =
      getValidatedAssessmentSchemeId(
        request,
        response,
      );

    if (!assessmentSchemeId) {
      return;
    }

    const validation =
      updateAssessmentSchemeSchema.safeParse(
        request.body,
      );

    if (!validation.success) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message:
            'Los datos del sistema de calificación no son válidos.',
          details: getValidationDetails(
            validation.error.issues,
          ),
        },
      });

      return;
    }

    try {
      const assessmentScheme =
        await updateAssessmentScheme(
          assessmentSchemeId,
          validation.data,
        );

      response.status(200).json({
        message:
          'Sistema de calificación actualizado correctamente.',
        assessmentScheme,
      });
    } catch (error: unknown) {
      if (
        handleKnownAssessmentSchemeError(
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

assessmentSchemesRouter.delete(
  '/:id',
  requirePermission('evaluations.archive'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const assessmentSchemeId =
      getValidatedAssessmentSchemeId(
        request,
        response,
      );

    if (!assessmentSchemeId) {
      return;
    }

    try {
      const assessmentScheme =
        await archiveAssessmentScheme(
          assessmentSchemeId,
        );

      response.status(200).json({
        message:
          'Sistema de calificación archivado correctamente.',
        assessmentScheme,
      });
    } catch (error: unknown) {
      if (
        handleKnownAssessmentSchemeError(
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

assessmentSchemesRouter.post(
  '/:id/restore',
  requirePermission('evaluations.archive'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const assessmentSchemeId =
      getValidatedAssessmentSchemeId(
        request,
        response,
      );

    if (!assessmentSchemeId) {
      return;
    }

    try {
      const assessmentScheme =
        await restoreAssessmentScheme(
          assessmentSchemeId,
        );

      response.status(200).json({
        message:
          'Sistema de calificación restaurado correctamente.',
        assessmentScheme,
      });
    } catch (error: unknown) {
      if (
        handleKnownAssessmentSchemeError(
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
