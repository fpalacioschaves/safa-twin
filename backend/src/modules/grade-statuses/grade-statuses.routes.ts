import {
  Router,
  type Request,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  createGradeStatusSchema,
  gradeStatusIdParamsSchema,
  listGradeStatusesQuerySchema,
  updateGradeStatusSchema,
} from './grade-statuses.schemas.js';

import {
  archiveGradeStatus,
  createGradeStatus,
  getGradeStatusById,
  GradeStatusAlreadyArchivedError,
  GradeStatusAlreadyExistsError,
  GradeStatusArchivedError,
  GradeStatusNotArchivedError,
  GradeStatusNotFoundError,
  listGradeStatuses,
  restoreGradeStatus,
  updateGradeStatus,
} from './grade-statuses.service.js';

export const gradeStatusesRouter = Router();

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

function getValidatedGradeStatusId(
  request: Request,
  response: Response,
): number | null {
  const validation =
    gradeStatusIdParamsSchema.safeParse(
      request.params,
    );

  if (!validation.success) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message:
          'El identificador del estado no es válido.',
        details: getValidationDetails(
          validation.error.issues,
        ),
      },
    });

    return null;
  }

  return validation.data.id;
}

function handleKnownGradeStatusError(
  error: unknown,
  response: Response,
): boolean {
  if (error instanceof GradeStatusAlreadyExistsError) {
    response.status(409).json({
      error: {
        code: 'GRADE_STATUS_ALREADY_EXISTS',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof GradeStatusNotFoundError) {
    response.status(404).json({
      error: {
        code: 'GRADE_STATUS_NOT_FOUND',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof GradeStatusArchivedError) {
    response.status(409).json({
      error: {
        code: 'GRADE_STATUS_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof GradeStatusAlreadyArchivedError) {
    response.status(409).json({
      error: {
        code: 'GRADE_STATUS_ALREADY_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof GradeStatusNotArchivedError) {
    response.status(409).json({
      error: {
        code: 'GRADE_STATUS_NOT_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  return false;
}

gradeStatusesRouter.get(
  '/',
  requirePermission('grade-statuses.list'),
  async (request, response, next) => {
    try {
      const validation =
        listGradeStatusesQuerySchema.safeParse(
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
        await listGradeStatuses(validation.data),
      );
    } catch (error: unknown) {
      next(error);
    }
  },
);

gradeStatusesRouter.get(
  '/:id',
  requirePermission('grade-statuses.view'),
  async (request, response, next) => {
    try {
      const gradeStatusId =
        getValidatedGradeStatusId(
          request,
          response,
        );

      if (gradeStatusId === null) {
        return;
      }

      response.status(200).json({
        gradeStatus:
          await getGradeStatusById(gradeStatusId),
      });
    } catch (error: unknown) {
      if (
        handleKnownGradeStatusError(
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

gradeStatusesRouter.post(
  '/',
  requirePermission('grade-statuses.create'),
  async (request, response, next) => {
    try {
      const validation =
        createGradeStatusSchema.safeParse(
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

      const gradeStatus =
        await createGradeStatus(validation.data);

      response.status(201).json({
        message:
          'Estado de calificación creado correctamente.',
        gradeStatus,
      });
    } catch (error: unknown) {
      if (
        handleKnownGradeStatusError(
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

gradeStatusesRouter.put(
  '/:id',
  requirePermission('grade-statuses.update'),
  async (request, response, next) => {
    try {
      const gradeStatusId =
        getValidatedGradeStatusId(
          request,
          response,
        );

      if (gradeStatusId === null) {
        return;
      }

      const validation =
        updateGradeStatusSchema.safeParse(
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

      const gradeStatus =
        await updateGradeStatus(
          gradeStatusId,
          validation.data,
        );

      response.status(200).json({
        message:
          'Estado de calificación actualizado correctamente.',
        gradeStatus,
      });
    } catch (error: unknown) {
      if (
        handleKnownGradeStatusError(
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

gradeStatusesRouter.delete(
  '/:id',
  requirePermission('grade-statuses.archive'),
  async (request, response, next) => {
    try {
      const gradeStatusId =
        getValidatedGradeStatusId(
          request,
          response,
        );

      if (gradeStatusId === null) {
        return;
      }

      const gradeStatus =
        await archiveGradeStatus(
          gradeStatusId,
        );

      response.status(200).json({
        message:
          'Estado de calificación archivado correctamente.',
        gradeStatus,
      });
    } catch (error: unknown) {
      if (
        handleKnownGradeStatusError(
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

gradeStatusesRouter.post(
  '/:id/restore',
  requirePermission('grade-statuses.archive'),
  async (request, response, next) => {
    try {
      const gradeStatusId =
        getValidatedGradeStatusId(
          request,
          response,
        );

      if (gradeStatusId === null) {
        return;
      }

      const gradeStatus =
        await restoreGradeStatus(
          gradeStatusId,
        );

      response.status(200).json({
        message:
          'Estado de calificación restaurado correctamente.',
        gradeStatus,
      });
    } catch (error: unknown) {
      if (
        handleKnownGradeStatusError(
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
