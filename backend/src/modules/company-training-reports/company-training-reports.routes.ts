import {
  Router,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  companyTrainingReportExportSchema,
  companyTrainingReportFiltersSchema,
} from './company-training-reports.schemas.js';

import {
  exportCompanyTrainingReportCsv,
  getCompanyTrainingReportPreview,
} from './company-training-reports.service.js';

export const companyTrainingReportsRouter = Router();

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

function getAuthenticatedUserId(
  response: Response,
): number | null {
  const authenticatedUser = response.locals
    .authenticatedUser as {
      id?: unknown;
    } | undefined;

  if (
    typeof authenticatedUser?.id === 'number'
    && Number.isInteger(authenticatedUser.id)
    && authenticatedUser.id > 0
  ) {
    return authenticatedUser.id;
  }

  return null;
}

companyTrainingReportsRouter.get(
  '/preview',
  requirePermission('company-training.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      companyTrainingReportFiltersSchema.safeParse(
        request.query,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los filtros del informe no son válidos.',
        validation.error.issues,
      );

      return;
    }

    try {
      const report =
        await getCompanyTrainingReportPreview(
          validation.data,
        );

      response.status(200).json(report);
    } catch (error: unknown) {
      next(error);
    }
  },
);

companyTrainingReportsRouter.post(
  '/export-csv',
  requirePermission('company-training.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      companyTrainingReportExportSchema.safeParse(
        request.body,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los parámetros de exportación no son válidos.',
        validation.error.issues,
      );

      return;
    }

    const authenticatedUserId =
      getAuthenticatedUserId(response);

    if (authenticatedUserId === null) {
      response.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message:
            'No se ha podido identificar al usuario autenticado.',
        },
      });

      return;
    }

    try {
      const result = await exportCompanyTrainingReportCsv(
        validation.data,
        authenticatedUserId,
      );

      response.status(201).json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);
