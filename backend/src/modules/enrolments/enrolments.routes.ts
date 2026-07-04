import {
  Router,
  type Request,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  createEnrolmentSchema,
  enrolmentIdParamsSchema,
  listEnrolmentsQuerySchema,
  updateEnrolmentSchema,
} from './enrolments.schemas.js';

import {
  archiveEnrolment,
  createEnrolment,
  EnrolmentAlreadyArchivedError,
  EnrolmentAlreadyExistsError,
  EnrolmentArchivedError,
  EnrolmentInvalidCancellationDateError,
  EnrolmentNotArchivedError,
  EnrolmentNotFoundError,
  EnrolmentRelatedEntityUnavailableError,
  getEnrolmentById,
  listEnrolments,
  restoreEnrolment,
  updateEnrolment,
} from './enrolments.service.js';

export const enrolmentsRouter = Router();

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

function getValidatedEnrolmentId(
  request: Request,
  response: Response,
): number | null {
  const validation =
    enrolmentIdParamsSchema.safeParse(
      request.params,
    );

  if (!validation.success) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',

        message:
          'El identificador de la matrícula no es válido.',

        details: getValidationDetails(
          validation.error.issues,
        ),
      },
    });

    return null;
  }

  return validation.data.id;
}

function handleKnownEnrolmentError(
  error: unknown,
  response: Response,
): boolean {
  if (
    error instanceof EnrolmentAlreadyExistsError
  ) {
    response.status(409).json({
      error: {
        code: 'ENROLMENT_ALREADY_EXISTS',
        message: error.message,
      },
    });

    return true;
  }

  if (
    error instanceof EnrolmentNotFoundError
  ) {
    response.status(404).json({
      error: {
        code: 'ENROLMENT_NOT_FOUND',
        message: error.message,
      },
    });

    return true;
  }

  if (
    error instanceof EnrolmentArchivedError
  ) {
    response.status(409).json({
      error: {
        code: 'ENROLMENT_ARCHIVED',
        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof EnrolmentAlreadyArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'ENROLMENT_ALREADY_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error instanceof EnrolmentNotArchivedError
  ) {
    response.status(409).json({
      error: {
        code: 'ENROLMENT_NOT_ARCHIVED',
        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof EnrolmentRelatedEntityUnavailableError
  ) {
    response.status(422).json({
      error: {
        code:
          'ENROLMENT_RELATED_ENTITY_UNAVAILABLE',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof EnrolmentInvalidCancellationDateError
  ) {
    response.status(422).json({
      error: {
        code:
          'ENROLMENT_INVALID_CANCELLATION_DATE',

        message: error.message,

        details: [
          {
            field: 'cancelledAt',
            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  return false;
}

enrolmentsRouter.get(
  '/',
  requirePermission('enrolments.list'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        listEnrolmentsQuerySchema.safeParse(
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

      const result =
        await listEnrolments(
          validation.data,
        );

      response.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);

enrolmentsRouter.post(
  '/',
  requirePermission('enrolments.create'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        createEnrolmentSchema.safeParse(
          request.body,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos de la matrícula no son válidos.',

            details: getValidationDetails(
              validation.error.issues,
            ),
          },
        });

        return;
      }

      const enrolment =
        await createEnrolment(
          validation.data,
        );

      response.status(201).json({
        message:
          'La matrícula se ha creado correctamente.',

        enrolment,
      });
    } catch (error: unknown) {
      if (
        handleKnownEnrolmentError(
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

enrolmentsRouter.post(
  '/:id/restore',
  requirePermission('enrolments.archive'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const enrolmentId =
        getValidatedEnrolmentId(
          request,
          response,
        );

      if (enrolmentId === null) {
        return;
      }

      const enrolment =
        await restoreEnrolment(
          enrolmentId,
        );

      response.status(200).json({
        message:
          'La matrícula se ha restaurado correctamente.',

        enrolment,
      });
    } catch (error: unknown) {
      if (
        handleKnownEnrolmentError(
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

enrolmentsRouter.get(
  '/:id',
  requirePermission('enrolments.view'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const enrolmentId =
        getValidatedEnrolmentId(
          request,
          response,
        );

      if (enrolmentId === null) {
        return;
      }

      const enrolment =
        await getEnrolmentById(
          enrolmentId,
        );

      response.status(200).json({
        enrolment,
      });
    } catch (error: unknown) {
      if (
        handleKnownEnrolmentError(
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

enrolmentsRouter.put(
  '/:id',
  requirePermission('enrolments.update'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const enrolmentId =
        getValidatedEnrolmentId(
          request,
          response,
        );

      if (enrolmentId === null) {
        return;
      }

      const validation =
        updateEnrolmentSchema.safeParse(
          request.body,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos de la matrícula no son válidos.',

            details: getValidationDetails(
              validation.error.issues,
            ),
          },
        });

        return;
      }

      const enrolment =
        await updateEnrolment(
          enrolmentId,
          validation.data,
        );

      response.status(200).json({
        message:
          'La matrícula se ha actualizado correctamente.',

        enrolment,
      });
    } catch (error: unknown) {
      if (
        handleKnownEnrolmentError(
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

enrolmentsRouter.delete(
  '/:id',
  requirePermission('enrolments.archive'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const enrolmentId =
        getValidatedEnrolmentId(
          request,
          response,
        );

      if (enrolmentId === null) {
        return;
      }

      const enrolment =
        await archiveEnrolment(
          enrolmentId,
        );

      response.status(200).json({
        message:
          'La matrícula se ha archivado correctamente.',

        enrolment,
      });
    } catch (error: unknown) {
      if (
        handleKnownEnrolmentError(
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
