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
  documentTemplateGenerationBodySchema,
  documentTemplateParamsSchema,
} from './document-template.schemas.js';
import {
  generateDocumentFromTemplate,
} from './document-template-generation-dispatcher.service.js';
import {
  documentTemplateRouter as originalDocumentTemplateRouter,
} from './document-template.routes.js';

export const documentTemplateRouterV2 = Router();

const DOCUMENT_TEMPLATE_VIEW_PERMISSION =
  'evaluations.statistics.view';

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
        'Los datos enviados para generar el documento no son válidos.',
      details: getValidationDetails(details),
    },
  });
}

function sendTemplateNotFound(
  response: Response,
): void {
  response.status(404).json({
    error: {
      code: 'DOCUMENT_TEMPLATE_NOT_FOUND',
      message:
        'No existe una plantilla documental activa con ese código.',
    },
  });
}

documentTemplateRouterV2.post(
  '/:code/generate',
  requirePermission(DOCUMENT_TEMPLATE_VIEW_PERMISSION),
  async (request, response, next) => {
    try {
      const parsedParams = documentTemplateParamsSchema.safeParse(
        request.params,
      );

      if (!parsedParams.success) {
        sendValidationError(
          response,
          parsedParams.error.issues,
        );
        return;
      }

      const parsedBody = documentTemplateGenerationBodySchema.safeParse(
        request.body,
      );

      if (!parsedBody.success) {
        sendValidationError(
          response,
          parsedBody.error.issues,
        );
        return;
      }

      const authenticatedUser = request.user as AuthenticatedUser | undefined;

      if (!authenticatedUser) {
        response.status(401).json({
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Debes iniciar sesión para generar documentos.',
          },
        });
        return;
      }

      const result = await generateDocumentFromTemplate(
        parsedParams.data.code,
        parsedBody.data,
        authenticatedUser.id,
      );

      if (!result) {
        sendTemplateNotFound(response);
        return;
      }

      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

documentTemplateRouterV2.use(originalDocumentTemplateRouter);
