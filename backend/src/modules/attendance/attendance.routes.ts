import {
  Router,
  type Request,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  attendanceRecordIdParamsSchema,
  attendanceSummaryQuerySchema,
  createAttendanceRecordSchema,
  listAttendanceRecordsQuerySchema,
  updateAttendanceRecordSchema,
} from './attendance.schemas.js';

import {
  archiveAttendanceRecord,
  AttendanceRecordAlreadyArchivedError,
  AttendanceRecordArchivedError,
  AttendanceRecordNotFoundError,
  AttendanceRelatedEntityUnavailableError,
  createAttendanceRecord,
  getAttendanceRecordById,
  getAttendanceSummary,
  listAttendanceRecords,
  updateAttendanceRecord,
} from './attendance.service.js';

export const attendanceRouter = Router();

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

function sendValidationError(
  response: Response,
  message: string,
  issues: {
    path: PropertyKey[];
    message: string;
  }[],
): void {
  response.status(422).json({
    error: {
      code: 'VALIDATION_ERROR',
      message,
      details: getValidationDetails(issues),
    },
  });
}

function getValidatedAttendanceRecordId(
  request: Request,
  response: Response,
): number | null {
  const validation = attendanceRecordIdParamsSchema.safeParse(
    request.params,
  );

  if (!validation.success) {
    sendValidationError(
      response,
      'El identificador del registro de asistencia no es válido.',
      validation.error.issues,
    );

    return null;
  }

  return validation.data.id;
}

function getAuthenticatedUserId(
  response: Response,
): number | null {
  const authenticatedUser = response.locals.authenticatedUser as
    | { id?: number }
    | undefined;

  return authenticatedUser?.id ?? null;
}

function handleKnownAttendanceError(
  error: unknown,
  response: Response,
): boolean {
  if (error instanceof AttendanceRecordNotFoundError) {
    response.status(404).json({
      error: {
        code: 'ATTENDANCE_RECORD_NOT_FOUND',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof AttendanceRecordArchivedError) {
    response.status(409).json({
      error: {
        code: 'ATTENDANCE_RECORD_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof AttendanceRecordAlreadyArchivedError) {
    response.status(409).json({
      error: {
        code: 'ATTENDANCE_RECORD_ALREADY_ARCHIVED',
        message: error.message,
      },
    });
    return true;
  }

  if (error instanceof AttendanceRelatedEntityUnavailableError) {
    response.status(422).json({
      error: {
        code: 'ATTENDANCE_RELATED_ENTITY_UNAVAILABLE',
        message: error.message,
      },
    });
    return true;
  }

  return false;
}

attendanceRouter.get(
  '/',
  requirePermission('attendance.view'),
  async (request, response, next) => {
    const validation = listAttendanceRecordsQuerySchema.safeParse(
      request.query,
    );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los filtros de asistencia no son válidos.',
        validation.error.issues,
      );
      return;
    }

    try {
      response.status(200).json(
        await listAttendanceRecords(validation.data),
      );
    } catch (error: unknown) {
      next(error);
    }
  },
);

attendanceRouter.get(
  '/summary',
  requirePermission('attendance.view'),
  async (request, response, next) => {
    const validation = attendanceSummaryQuerySchema.safeParse(
      request.query,
    );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los filtros del resumen de asistencia no son válidos.',
        validation.error.issues,
      );
      return;
    }

    try {
      response.status(200).json(
        await getAttendanceSummary(validation.data),
      );
    } catch (error: unknown) {
      next(error);
    }
  },
);

attendanceRouter.get(
  '/:id',
  requirePermission('attendance.view'),
  async (request, response, next) => {
    const attendanceRecordId = getValidatedAttendanceRecordId(
      request,
      response,
    );

    if (attendanceRecordId === null) {
      return;
    }

    try {
      response.status(200).json({
        attendanceRecord:
          await getAttendanceRecordById(attendanceRecordId),
      });
    } catch (error: unknown) {
      if (handleKnownAttendanceError(error, response)) {
        return;
      }

      next(error);
    }
  },
);

attendanceRouter.post(
  '/',
  requirePermission('attendance.manage'),
  async (request, response, next) => {
    const validation = createAttendanceRecordSchema.safeParse(
      request.body,
    );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los datos del registro de asistencia no son válidos.',
        validation.error.issues,
      );
      return;
    }

    try {
      response.status(201).json({
        attendanceRecord: await createAttendanceRecord(
          validation.data,
          getAuthenticatedUserId(response),
        ),
      });
    } catch (error: unknown) {
      if (handleKnownAttendanceError(error, response)) {
        return;
      }

      next(error);
    }
  },
);

attendanceRouter.put(
  '/:id',
  requirePermission('attendance.manage'),
  async (request, response, next) => {
    const attendanceRecordId = getValidatedAttendanceRecordId(
      request,
      response,
    );

    if (attendanceRecordId === null) {
      return;
    }

    const validation = updateAttendanceRecordSchema.safeParse(
      request.body,
    );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los datos del registro de asistencia no son válidos.',
        validation.error.issues,
      );
      return;
    }

    try {
      response.status(200).json({
        attendanceRecord: await updateAttendanceRecord(
          attendanceRecordId,
          validation.data,
        ),
      });
    } catch (error: unknown) {
      if (handleKnownAttendanceError(error, response)) {
        return;
      }

      next(error);
    }
  },
);

attendanceRouter.delete(
  '/:id',
  requirePermission('attendance.manage'),
  async (request, response, next) => {
    const attendanceRecordId = getValidatedAttendanceRecordId(
      request,
      response,
    );

    if (attendanceRecordId === null) {
      return;
    }

    try {
      response.status(200).json(
        await archiveAttendanceRecord(attendanceRecordId),
      );
    } catch (error: unknown) {
      if (handleKnownAttendanceError(error, response)) {
        return;
      }

      next(error);
    }
  },
);
