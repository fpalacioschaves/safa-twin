import {
  Router,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  documentTemplateListQuerySchema,
  documentTemplateParamsSchema,
  documentTemplateValidationBodySchema,
} from './document-template.schemas.js';

import {
  getDocumentTemplateByCode,
  getDocumentTemplateRequiredInputs,
  listDocumentTemplates,
  validateDocumentTemplateContext,
} from './document-template.service.js';

export const documentTemplateRouter = Router();

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
        'Los datos enviados para consultar plantillas documentales no son válidos.',
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

documentTemplateRouter.get(
  '/',
  requirePermission(DOCUMENT_TEMPLATE_VIEW_PERMISSION),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      documentTemplateListQuerySchema.safeParse(
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
      const templates =
        listDocumentTemplates(validation.data);

      response.status(200).json({
        items: templates,
        total: templates.length,
      });
    } catch (error: unknown) {
      next(error);
    }
  },
);

documentTemplateRouter.get(
  '/:code/variables',
  requirePermission(DOCUMENT_TEMPLATE_VIEW_PERMISSION),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      documentTemplateParamsSchema.safeParse(
        request.params,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        validation.error.issues,
      );

      return;
    }

    try {
      const template =
        getDocumentTemplateByCode(
          validation.data.code,
        );

      if (!template) {
        sendTemplateNotFound(response);

        return;
      }

      response.status(200).json({
        templateCode: template.code,
        templateName: template.name,
        variables: template.variables,
        sections: template.sections,
      });
    } catch (error: unknown) {
      next(error);
    }
  },
);

documentTemplateRouter.get(
  '/:code/required-inputs',
  requirePermission(DOCUMENT_TEMPLATE_VIEW_PERMISSION),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      documentTemplateParamsSchema.safeParse(
        request.params,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        validation.error.issues,
      );

      return;
    }

    try {
      const requiredInputs =
        getDocumentTemplateRequiredInputs(
          validation.data.code,
        );

      if (!requiredInputs) {
        sendTemplateNotFound(response);

        return;
      }

      response.status(200).json({
        templateCode: validation.data.code,
        requiredInputs,
      });
    } catch (error: unknown) {
      next(error);
    }
  },
);

documentTemplateRouter.post(
  '/:code/validate',
  requirePermission(DOCUMENT_TEMPLATE_VIEW_PERMISSION),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const paramsValidation =
      documentTemplateParamsSchema.safeParse(
        request.params,
      );

    if (!paramsValidation.success) {
      sendValidationError(
        response,
        paramsValidation.error.issues,
      );

      return;
    }

    const bodyValidation =
      documentTemplateValidationBodySchema.safeParse(
        request.body,
      );

    if (!bodyValidation.success) {
      sendValidationError(
        response,
        bodyValidation.error.issues,
      );

      return;
    }

    try {
      const result =
        validateDocumentTemplateContext(
          paramsValidation.data.code,
          bodyValidation.data,
        );

      if (!result) {
        sendTemplateNotFound(response);

        return;
      }

      response.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);

documentTemplateRouter.get(
  '/:code',
  requirePermission(DOCUMENT_TEMPLATE_VIEW_PERMISSION),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      documentTemplateParamsSchema.safeParse(
        request.params,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        validation.error.issues,
      );

      return;
    }

    try {
      const template =
        getDocumentTemplateByCode(
          validation.data.code,
        );

      if (!template) {
        sendTemplateNotFound(response);

        return;
      }

      response.status(200).json(template);
    } catch (error: unknown) {
      next(error);
    }
  },
);
