import {
  Router,
  type Request,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  createGradeSchema,
  gradeIdParamsSchema,
  listGradesQuerySchema,
  updateGradeSchema,
} from './grades.schemas.js';

import {
  archiveGrade,
  createGrade,
  GradeAlreadyArchivedError,
  GradeAlreadyExistsError,
  GradeArchivedError,
  GradeInvalidScoresError,
  GradeLockedError,
  GradeNotArchivedError,
  GradeNotFoundError,
  GradeRelatedEntityUnavailableError,
  getGradeById,
  listGrades,
  restoreGrade,
  updateGrade,
} from './grades.service.js';

export const gradesRouter = Router();

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

function getValidatedGradeId(
  request: Request,
  response: Response,
): number | null {
  const validation =
    gradeIdParamsSchema.safeParse(
      request.params,
    );

  if (!validation.success) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message:
          'El identificador de la calificación no es válido.',
        details: getValidationDetails(
          validation.error.issues,
        ),
      },
    });

    return null;
  }

  return validation.data.id;
}

function handleKnownGradeError(
  error: unknown,
  response: Response,
): boolean {
  if (error instanceof GradeAlreadyExistsError) {
    response.status(409).json({
      error: {
        code: 'GRADE_ALREADY_EXISTS',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof GradeNotFoundError) {
    response.status(404).json({
      error: {
        code: 'GRADE_NOT_FOUND',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof GradeArchivedError) {
    response.status(409).json({
      error: {
        code: 'GRADE_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  if (
    error instanceof GradeAlreadyArchivedError
  ) {
    response.status(409).json({
      error: {
        code: 'GRADE_ALREADY_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  if (
    error instanceof GradeNotArchivedError
  ) {
    response.status(409).json({
      error: {
        code: 'GRADE_NOT_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof GradeLockedError) {
    response.status(409).json({
      error: {
        code: 'GRADE_LOCKED',
        message: error.message,
      },
    });
    return true;
  }

  if (
    error
    instanceof GradeRelatedEntityUnavailableError
  ) {
    response.status(422).json({
      error: {
        code:
          'GRADE_RELATED_ENTITY_UNAVAILABLE',
        message: error.message,
      },
    });
    return true;
  }

  if (
    error instanceof GradeInvalidScoresError
  ) {
    response.status(422).json({
      error: {
        code: 'GRADE_INVALID_SCORES',
        message: error.message,
      },
    });
    return true;
  }

  return false;
}

gradesRouter.get(
  '/',
  requirePermission('evaluations.list'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      listGradesQuerySchema.safeParse(
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
        await listGrades(validation.data);

      response.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);

gradesRouter.get(
  '/:id',
  requirePermission('evaluations.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const gradeId =
      getValidatedGradeId(
        request,
        response,
      );

    if (gradeId === null) {
      return;
    }

    try {
      const result =
        await getGradeById(gradeId);

      response.status(200).json(result);
    } catch (error: unknown) {
      if (
        handleKnownGradeError(
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

gradesRouter.post(
  '/',
  requirePermission('evaluations.update'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      createGradeSchema.safeParse(
        request.body,
      );

    if (!validation.success) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message:
            'Los datos de la calificación no son válidos.',
          details: getValidationDetails(
            validation.error.issues,
          ),
        },
      });

      return;
    }

    try {
      const result =
        await createGrade(validation.data);

      response.status(201).json(result);
    } catch (error: unknown) {
      if (
        handleKnownGradeError(
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

gradesRouter.put(
  '/:id',
  requirePermission('evaluations.update'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const gradeId =
      getValidatedGradeId(
        request,
        response,
      );

    if (gradeId === null) {
      return;
    }

    const validation =
      updateGradeSchema.safeParse(
        request.body,
      );

    if (!validation.success) {
      response.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message:
            'Los datos de la calificación no son válidos.',
          details: getValidationDetails(
            validation.error.issues,
          ),
        },
      });

      return;
    }

    try {
      const result =
        await updateGrade(
          gradeId,
          validation.data,
        );

      response.status(200).json(result);
    } catch (error: unknown) {
      if (
        handleKnownGradeError(
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

gradesRouter.delete(
  '/:id',
  requirePermission('evaluations.update'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const gradeId =
      getValidatedGradeId(
        request,
        response,
      );

    if (gradeId === null) {
      return;
    }

    try {
      const result =
        await archiveGrade(gradeId);

      response.status(200).json(result);
    } catch (error: unknown) {
      if (
        handleKnownGradeError(
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

gradesRouter.post(
  '/:id/restore',
  requirePermission('evaluations.update'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const gradeId =
      getValidatedGradeId(
        request,
        response,
      );

    if (gradeId === null) {
      return;
    }

    try {
      const result =
        await restoreGrade(gradeId);

      response.status(200).json(result);
    } catch (error: unknown) {
      if (
        handleKnownGradeError(
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
