import {
  Router,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  digitalTwinMessageSchema,
} from './digital-twin.schemas.js';

import {
  getDigitalTwinStatus,
  processDigitalTwinMessage,
} from './digital-twin.service.js';

export const digitalTwinRouter = Router();

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

digitalTwinRouter.get(
  '/status',
  requirePermission('digital-twin.use'),
  (_request, response) => {
    response.status(200).json({
      status: getDigitalTwinStatus(),
    });
  },
);

digitalTwinRouter.post(
  '/messages',
  requirePermission('digital-twin.use'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation = digitalTwinMessageSchema.safeParse(
      request.body,
    );

    if (!validation.success) {
      sendValidationError(
        response,
        'La petición enviada al gemelo digital no es válida.',
        validation.error.issues,
      );

      return;
    }

    try {
      const result = await processDigitalTwinMessage(
        validation.data,
      );

      response.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);
