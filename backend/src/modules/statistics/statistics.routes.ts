import {
  Router,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import type {
  AuthenticatedUser,
} from '../auth/auth.service.js';

import {
  academicStatisticsQuerySchema,
} from './statistics.schemas.js';

import {
  getAcademicStatistics,
} from './statistics.service.js';

import {
  generateAcademicStatisticsXlsx,
} from './statistics-xlsx-export.service.js';

export const statisticsRouter = Router();

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
  details: {
    path: PropertyKey[];
    message: string;
  }[],
): void {
  response.status(422).json({
    error: {
      code: 'VALIDATION_ERROR',
      message:
        'Los filtros estadísticos enviados no son válidos.',
      details: getValidationDetails(details),
    },
  });
}

statisticsRouter.get(
  '/academic-summary/export/xlsx',
  requirePermission('evaluations.statistics.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      academicStatisticsQuerySchema.safeParse(
        request.query,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        validation.error.issues,
      );

      return;
    }

    const authenticatedUser =
      response.locals.authenticatedUser as
        | AuthenticatedUser
        | undefined;

    if (!authenticatedUser) {
      response.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Es necesario iniciar sesión.',
        },
      });

      return;
    }

    try {
      const exportResult =
        await generateAcademicStatisticsXlsx(
          validation.data,
          authenticatedUser.id,
        );

      response.setHeader(
        'Content-Type',
        exportResult.mimeType,
      );
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${exportResult.fileName}"`,
      );
      response.setHeader(
        'Content-Length',
        exportResult.buffer.length.toString(),
      );
      response.setHeader(
        'X-Generated-Document-Id',
        exportResult.documentId.toString(),
      );
      response.setHeader(
        'X-Generated-Document-Path',
        exportResult.filePath,
      );

      response.status(200).send(
        exportResult.buffer,
      );
    } catch (error: unknown) {
      next(error);
    }
  },
);

statisticsRouter.get(
  '/academic-summary',
  requirePermission('evaluations.statistics.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      academicStatisticsQuerySchema.safeParse(
        request.query,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        validation.error.issues,
      );

      return;
    }

    try {
      const result =
        await getAcademicStatistics(
          validation.data,
        );

      response.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);
