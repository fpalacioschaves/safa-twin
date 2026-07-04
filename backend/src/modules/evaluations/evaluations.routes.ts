import {
  Router,
  type Request,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  createEvaluationSchema,
  evaluationIdParamsSchema,
  listEvaluationsQuerySchema,
  updateEvaluationSchema,
} from './evaluations.schemas.js';

import {
  archiveEvaluation,
  createEvaluation,
  EvaluationAlreadyArchivedError,
  EvaluationAlreadyExistsError,
  EvaluationArchivedError,
  EvaluationNotArchivedError,
  EvaluationNotFoundError,
  EvaluationRelatedEntityUnavailableError,
  getEvaluationById,
  listEvaluations,
  restoreEvaluation,
  updateEvaluation,
} from './evaluations.service.js';

export const evaluationsRouter = Router();

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

function getValidatedEvaluationId(
  request: Request,
  response: Response,
): number | null {
  const validation =
    evaluationIdParamsSchema.safeParse(
      request.params,
    );

  if (!validation.success) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message:
          'El identificador de la evaluación no es válido.',
        details: getValidationDetails(
          validation.error.issues,
        ),
      },
    });

    return null;
  }

  return validation.data.id;
}

function handleKnownEvaluationError(
  error: unknown,
  response: Response,
): boolean {
  if (error instanceof EvaluationAlreadyExistsError) {
    response.status(409).json({
      error: {
        code: 'EVALUATION_ALREADY_EXISTS',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof EvaluationNotFoundError) {
    response.status(404).json({
      error: {
        code: 'EVALUATION_NOT_FOUND',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof EvaluationArchivedError) {
    response.status(409).json({
      error: {
        code: 'EVALUATION_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof EvaluationAlreadyArchivedError) {
    response.status(409).json({
      error: {
        code: 'EVALUATION_ALREADY_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof EvaluationNotArchivedError) {
    response.status(409).json({
      error: {
        code: 'EVALUATION_NOT_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  if (
    error
    instanceof EvaluationRelatedEntityUnavailableError
  ) {
    response.status(422).json({
      error: {
        code:
          'EVALUATION_RELATED_ENTITY_UNAVAILABLE',
        message: error.message,
      },
    });
    return true;
  }

  return false;
}

evaluationsRouter.get(
  '/',
  requirePermission('evaluations.list'),
  async (request, response, next) => {
    try {
      const validation =
        listEvaluationsQuerySchema.safeParse(
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

      response.status(200).json(
        await listEvaluations(validation.data),
      );
    } catch (error: unknown) {
      next(error);
    }
  },
);

evaluationsRouter.get(
  '/:id',
  requirePermission('evaluations.view'),
  async (request, response, next) => {
    try {
      const evaluationId =
        getValidatedEvaluationId(
          request,
          response,
        );

      if (evaluationId === null) {
        return;
      }

      response.status(200).json({
        evaluation:
          await getEvaluationById(evaluationId),
      });
    } catch (error: unknown) {
      if (
        handleKnownEvaluationError(
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

evaluationsRouter.post(
  '/',
  requirePermission('evaluations.create'),
  async (request, response, next) => {
    try {
      const validation =
        createEvaluationSchema.safeParse(
          request.body,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Los datos enviados no son válidos.',
            details: getValidationDetails(
              validation.error.issues,
            ),
          },
        });
        return;
      }

      const evaluation = await createEvaluation(
        validation.data,
      );

      response.status(201).json({
        message:
          'Evaluación creada correctamente.',
        evaluation,
      });
    } catch (error: unknown) {
      if (
        handleKnownEvaluationError(
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

evaluationsRouter.put(
  '/:id',
  requirePermission('evaluations.update'),
  async (request, response, next) => {
    try {
      const evaluationId =
        getValidatedEvaluationId(
          request,
          response,
        );

      if (evaluationId === null) {
        return;
      }

      const validation =
        updateEvaluationSchema.safeParse(
          request.body,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Los datos enviados no son válidos.',
            details: getValidationDetails(
              validation.error.issues,
            ),
          },
        });
        return;
      }

      const evaluation = await updateEvaluation(
        evaluationId,
        validation.data,
      );

      response.status(200).json({
        message:
          'Evaluación actualizada correctamente.',
        evaluation,
      });
    } catch (error: unknown) {
      if (
        handleKnownEvaluationError(
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

evaluationsRouter.delete(
  '/:id',
  requirePermission('evaluations.archive'),
  async (request, response, next) => {
    try {
      const evaluationId =
        getValidatedEvaluationId(
          request,
          response,
        );

      if (evaluationId === null) {
        return;
      }

      const evaluation = await archiveEvaluation(
        evaluationId,
      );

      response.status(200).json({
        message:
          'Evaluación archivada correctamente.',
        evaluation,
      });
    } catch (error: unknown) {
      if (
        handleKnownEvaluationError(
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

evaluationsRouter.post(
  '/:id/restore',
  requirePermission('evaluations.archive'),
  async (request, response, next) => {
    try {
      const evaluationId =
        getValidatedEvaluationId(
          request,
          response,
        );

      if (evaluationId === null) {
        return;
      }

      const evaluation = await restoreEvaluation(
        evaluationId,
      );

      response.status(200).json({
        message:
          'Evaluación restaurada correctamente.',
        evaluation,
      });
    } catch (error: unknown) {
      if (
        handleKnownEvaluationError(
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
