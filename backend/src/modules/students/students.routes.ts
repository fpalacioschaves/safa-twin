import {
  Router,
  type Request,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  createStudentSchema,
  listStudentsQuerySchema,
  studentIdParamsSchema,
  updateStudentSchema,
} from './students.schemas.js';

import {
  archiveStudent,
  createStudent,
  getStudentById,
  listStudents,
  restoreStudent,
  StudentAlreadyArchivedError,
  StudentArchivedError,
  StudentCodeAlreadyExistsError,
  StudentDocumentAlreadyExistsError,
  StudentIdentifierConflictError,
  StudentNotArchivedError,
  StudentNotFoundError,
  updateStudent,
} from './students.service.js';

export const studentsRouter = Router();

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

function getValidatedStudentId(
  request: Request,
  response: Response,
): number | null {
  const validation =
    studentIdParamsSchema.safeParse(
      request.params,
    );

  if (!validation.success) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',

        message:
          'El identificador del alumno no es válido.',

        details: getValidationDetails(
          validation.error.issues,
        ),
      },
    });

    return null;
  }

  return validation.data.id;
}

function handleKnownStudentError(
  error: unknown,
  response: Response,
): boolean {
  if (
    error
    instanceof StudentCodeAlreadyExistsError
  ) {
    response.status(409).json({
      error: {
        code:
          'STUDENT_CODE_ALREADY_EXISTS',

        message: error.message,

        details: [
          {
            field: 'studentCode',
            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof StudentDocumentAlreadyExistsError
  ) {
    response.status(409).json({
      error: {
        code:
          'STUDENT_DOCUMENT_ALREADY_EXISTS',

        message: error.message,

        details: [
          {
            field: 'documentNumber',
            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof StudentIdentifierConflictError
  ) {
    response.status(409).json({
      error: {
        code:
          'STUDENT_IDENTIFIER_CONFLICT',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error instanceof StudentNotFoundError
  ) {
    response.status(404).json({
      error: {
        code: 'STUDENT_NOT_FOUND',
        message: error.message,
      },
    });

    return true;
  }

  if (
    error instanceof StudentArchivedError
  ) {
    response.status(409).json({
      error: {
        code: 'STUDENT_ARCHIVED',
        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof StudentAlreadyArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'STUDENT_ALREADY_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error instanceof StudentNotArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'STUDENT_NOT_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  return false;
}

studentsRouter.get(
  '/',
  requirePermission('students.list'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        listStudentsQuerySchema.safeParse(
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
        await listStudents(
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

studentsRouter.post(
  '/',
  requirePermission('students.create'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        createStudentSchema.safeParse(
          request.body,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos del alumno no son válidos.',

            details: getValidationDetails(
              validation.error.issues,
            ),
          },
        });

        return;
      }

      const student =
        await createStudent(
          validation.data,
        );

      response.status(201).json({
        message:
          'El alumno se ha creado correctamente.',

        student,
      });
    } catch (error: unknown) {
      if (
        handleKnownStudentError(
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

studentsRouter.post(
  '/:id/restore',
  requirePermission('students.archive'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const studentId =
        getValidatedStudentId(
          request,
          response,
        );

      if (studentId === null) {
        return;
      }

      const student =
        await restoreStudent(
          studentId,
        );

      response.status(200).json({
        message:
          'El alumno se ha restaurado correctamente.',

        student,
      });
    } catch (error: unknown) {
      if (
        handleKnownStudentError(
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

studentsRouter.get(
  '/:id',
  requirePermission('students.view'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const studentId =
        getValidatedStudentId(
          request,
          response,
        );

      if (studentId === null) {
        return;
      }

      const student =
        await getStudentById(
          studentId,
        );

      response.status(200).json({
        student,
      });
    } catch (error: unknown) {
      if (
        handleKnownStudentError(
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

studentsRouter.put(
  '/:id',
  requirePermission('students.update'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const studentId =
        getValidatedStudentId(
          request,
          response,
        );

      if (studentId === null) {
        return;
      }

      const validation =
        updateStudentSchema.safeParse(
          request.body,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos del alumno no son válidos.',

            details: getValidationDetails(
              validation.error.issues,
            ),
          },
        });

        return;
      }

      const student =
        await updateStudent(
          studentId,
          validation.data,
        );

      response.status(200).json({
        message:
          'El alumno se ha actualizado correctamente.',

        student,
      });
    } catch (error: unknown) {
      if (
        handleKnownStudentError(
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

studentsRouter.delete(
  '/:id',
  requirePermission('students.archive'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const studentId =
        getValidatedStudentId(
          request,
          response,
        );

      if (studentId === null) {
        return;
      }

      const student =
        await archiveStudent(
          studentId,
        );

      response.status(200).json({
        message:
          'El alumno se ha archivado correctamente.',

        student,
      });
    } catch (error: unknown) {
      if (
        handleKnownStudentError(
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
