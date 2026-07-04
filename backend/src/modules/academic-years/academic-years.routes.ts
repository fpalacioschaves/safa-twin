import {
  Router,
  type Request,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  academicYearIdParamsSchema,
  createAcademicYearSchema,
  listAcademicYearsQuerySchema,
  updateAcademicYearSchema,
} from './academic-years.schemas.js';

import {
  AcademicYearAlreadyArchivedError,
  AcademicYearArchivedError,
  AcademicYearDateRangeOverlapError,
  AcademicYearNameAlreadyExistsError,
  AcademicYearNotArchivedError,
  AcademicYearNotFoundError,
  archiveAcademicYear,
  CannotArchiveCurrentAcademicYearError,
  CannotDeactivateCurrentAcademicYearError,
  createAcademicYear,
  getAcademicYearById,
  listAcademicYears,
  restoreAcademicYear,
  setCurrentAcademicYear,
  updateAcademicYear,
} from './academic-years.service.js';

export const academicYearsRouter =
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

function getValidatedAcademicYearId(
  request: Request,
  response: Response,
): number | null {
  const validation =
    academicYearIdParamsSchema.safeParse(
      request.params,
    );

  if (!validation.success) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',

        message:
          'El identificador del curso académico no es válido.',

        details: getValidationDetails(
          validation.error.issues,
        ),
      },
    });

    return null;
  }

  return validation.data.id;
}

function handleKnownAcademicYearError(
  error: unknown,
  response: Response,
): boolean {
  if (
    error
    instanceof AcademicYearNameAlreadyExistsError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_YEAR_NAME_ALREADY_EXISTS',

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
    instanceof AcademicYearDateRangeOverlapError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_YEAR_DATE_RANGE_OVERLAP',

        message: error.message,

        details: [
          {
            field: 'startDate',

            message:
              `El periodo se solapa con ${error.conflictingAcademicYearName}.`,
          },

          {
            field: 'endDate',

            message:
              `El periodo se solapa con ${error.conflictingAcademicYearName}.`,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicYearNotFoundError
  ) {
    response.status(404).json({
      error: {
        code:
          'ACADEMIC_YEAR_NOT_FOUND',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicYearArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_YEAR_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicYearAlreadyArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_YEAR_ALREADY_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof AcademicYearNotArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'ACADEMIC_YEAR_NOT_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof CannotArchiveCurrentAcademicYearError
  ) {
    response.status(409).json({
      error: {
        code:
          'CANNOT_ARCHIVE_CURRENT_ACADEMIC_YEAR',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof CannotDeactivateCurrentAcademicYearError
  ) {
    response.status(409).json({
      error: {
        code:
          'CANNOT_DEACTIVATE_CURRENT_ACADEMIC_YEAR',

        message: error.message,
      },
    });

    return true;
  }

  return false;
}

academicYearsRouter.get(
  '/',
  requirePermission(
    'academic-years.list',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        listAcademicYearsQuerySchema
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
        await listAcademicYears(
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

academicYearsRouter.post(
  '/',
  requirePermission(
    'academic-years.create',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        createAcademicYearSchema
          .safeParse(request.body);

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos del curso académico no son válidos.',

            details:
              getValidationDetails(
                validation.error.issues,
              ),
          },
        });

        return;
      }

      const academicYear =
        await createAcademicYear(
          validation.data,
        );

      response.status(201).json({
        message:
          'El curso académico se ha creado correctamente.',

        academicYear,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicYearError(
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

academicYearsRouter.post(
  '/:id/restore',
  requirePermission(
    'academic-years.archive',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const academicYearId =
        getValidatedAcademicYearId(
          request,
          response,
        );

      if (academicYearId === null) {
        return;
      }

      const academicYear =
        await restoreAcademicYear(
          academicYearId,
        );

      response.status(200).json({
        message:
          'El curso académico se ha restaurado correctamente.',

        academicYear,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicYearError(
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

academicYearsRouter.patch(
  '/:id/set-current',
  requirePermission(
    'academic-years.set-current',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const academicYearId =
        getValidatedAcademicYearId(
          request,
          response,
        );

      if (academicYearId === null) {
        return;
      }

      const academicYear =
        await setCurrentAcademicYear(
          academicYearId,
        );

      response.status(200).json({
        message:
          'El curso académico actual se ha establecido correctamente.',

        academicYear,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicYearError(
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

academicYearsRouter.get(
  '/:id',
  requirePermission(
    'academic-years.view',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const academicYearId =
        getValidatedAcademicYearId(
          request,
          response,
        );

      if (academicYearId === null) {
        return;
      }

      const academicYear =
        await getAcademicYearById(
          academicYearId,
        );

      response.status(200).json({
        academicYear,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicYearError(
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

academicYearsRouter.put(
  '/:id',
  requirePermission(
    'academic-years.update',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const academicYearId =
        getValidatedAcademicYearId(
          request,
          response,
        );

      if (academicYearId === null) {
        return;
      }

      const validation =
        updateAcademicYearSchema
          .safeParse(request.body);

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos del curso académico no son válidos.',

            details:
              getValidationDetails(
                validation.error.issues,
              ),
          },
        });

        return;
      }

      const academicYear =
        await updateAcademicYear(
          academicYearId,
          validation.data,
        );

      response.status(200).json({
        message:
          'El curso académico se ha actualizado correctamente.',

        academicYear,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicYearError(
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

academicYearsRouter.delete(
  '/:id',
  requirePermission(
    'academic-years.archive',
  ),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const academicYearId =
        getValidatedAcademicYearId(
          request,
          response,
        );

      if (academicYearId === null) {
        return;
      }

      const academicYear =
        await archiveAcademicYear(
          academicYearId,
        );

      response.status(200).json({
        message:
          'El curso académico se ha archivado correctamente.',

        academicYear,
      });
    } catch (error: unknown) {
      if (
        handleKnownAcademicYearError(
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