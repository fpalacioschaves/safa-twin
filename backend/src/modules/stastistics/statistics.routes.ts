import {
  Router,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  academicStatisticsQuerySchema,
} from './statistics.schemas.js';

import {
  getAcademicStatistics,
} from './statistics.service.js';

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
