import {
  Router,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  confirmDigitalTwinAction,
} from './digital-twin.actions.js';

import {
  digitalTwinConfirmActionSchema,
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

digitalTwinRouter.post(
  '/actions/confirm',
  requirePermission('digital-twin.use'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation = digitalTwinConfirmActionSchema.safeParse(
      request.body,
    );

    if (!validation.success) {
      sendValidationError(
        response,
        'La confirmación de la acción del gemelo digital no es válida.',
        validation.error.issues,
      );

      return;
    }

    const authenticatedUserId = getAuthenticatedUserId(
      response,
    );

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
      const result = await confirmDigitalTwinAction(
        validation.data.confirmationToken,
        authenticatedUserId,
      );

      response.status(201).json(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        response.status(422).json({
          error: {
            code: 'DIGITAL_TWIN_ACTION_NOT_CONFIRMABLE',
            message: error.message,
          },
        });

        return;
      }

      next(error);
    }
  },
);
