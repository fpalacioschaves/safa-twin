import {
  Router,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  curriculumImportSchema,
  curriculumListQuerySchema,
} from './curriculum.schemas.js';

import {
  CurriculumImportValidationError,
  importCurriculum,
  listEvaluationCriteria,
  listLearningOutcomes,
  listTrainingActions,
} from './curriculum.service.js';

export const curriculumRouter = Router();

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

function sendImportReferenceError(
  response: Response,
  error: CurriculumImportValidationError,
): void {
  response.status(422).json({
    error: {
      code: 'CURRICULUM_IMPORT_REFERENCE_ERROR',
      message: error.message,
      details: error.details,
    },
  });
}

curriculumRouter.get(
  '/learning-outcomes',
  requirePermission('curriculum.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      curriculumListQuerySchema.safeParse(
        request.query,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los filtros para consultar resultados de aprendizaje no son válidos.',
        validation.error.issues,
      );

      return;
    }

    try {
      const result = await listLearningOutcomes(
        validation.data,
      );

      response.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);

curriculumRouter.get(
  '/evaluation-criteria',
  requirePermission('curriculum.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      curriculumListQuerySchema.safeParse(
        request.query,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los filtros para consultar criterios de evaluación no son válidos.',
        validation.error.issues,
      );

      return;
    }

    try {
      const result = await listEvaluationCriteria(
        validation.data,
      );

      response.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);

curriculumRouter.get(
  '/training-actions',
  requirePermission('curriculum.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      curriculumListQuerySchema.safeParse(
        request.query,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los filtros para consultar acciones formativas no son válidos.',
        validation.error.issues,
      );

      return;
    }

    try {
      const result = await listTrainingActions(
        validation.data,
      );

      response.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);

curriculumRouter.post(
  '/import',
  requirePermission('curriculum.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      curriculumImportSchema.safeParse(
        request.body,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los datos de importación curricular no son válidos.',
        validation.error.issues,
      );

      return;
    }

    try {
      const result = await importCurriculum(
        validation.data,
      );

      response.status(201).json({
        message:
          'La importación curricular se ha procesado correctamente.',
        ...result,
      });
    } catch (error: unknown) {
      if (
        error
        instanceof CurriculumImportValidationError
      ) {
        sendImportReferenceError(
          response,
          error,
        );

        return;
      }

      next(error);
    }
  },
);
