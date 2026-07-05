import {
  Router,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  generatedDocumentParamsSchema,
  generatedDocumentsQuerySchema,
} from './generated-documents.schemas.js';

import {
  getGeneratedDocumentDownload,
  listGeneratedDocuments,
} from './generated-documents.service.js';

export const generatedDocumentsRouter = Router();

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
        'Los datos enviados para consultar documentos no son válidos.',
      details: getValidationDetails(details),
    },
  });
}

generatedDocumentsRouter.get(
  '/',
  requirePermission('evaluations.statistics.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      generatedDocumentsQuerySchema.safeParse(
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
      const result = await listGeneratedDocuments(
        validation.data,
      );

      response.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);

generatedDocumentsRouter.get(
  '/:id/download',
  requirePermission('evaluations.statistics.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      generatedDocumentParamsSchema.safeParse(
        request.params,
      );

    if (
      !validation.success
      || !validation.data.id
    ) {
      sendValidationError(
        response,
        validation.success
          ? []
          : validation.error.issues,
      );

      return;
    }

    try {
      const result =
        await getGeneratedDocumentDownload(
          validation.data.id,
        );

      if (!result) {
        response.status(404).json({
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message:
              'El documento generado no existe.',
          },
        });

        return;
      }

      response.setHeader(
        'Content-Type',
        result.item.mimeType,
      );
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.item.fileName}"`,
      );
      response.setHeader(
        'Content-Length',
        result.buffer.length.toString(),
      );

      response.status(200).send(result.buffer);
    } catch (error: unknown) {
      next(error);
    }
  },
);
