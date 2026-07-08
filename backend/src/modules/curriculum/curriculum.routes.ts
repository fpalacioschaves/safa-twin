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
  evaluationCriterionIdParamsSchema,
  evaluationCriterionMutationSchema,
  learningOutcomeIdParamsSchema,
  learningOutcomeMutationSchema,
} from './curriculum.schemas.js';

import {
  archiveEvaluationCriterion,
  createEvaluationCriterion,
  EvaluationCriterionMutationValidationError,
  restoreEvaluationCriterion,
  updateEvaluationCriterion,
} from './curriculum-evaluation-criteria.crud.service.js';

import {
  archiveLearningOutcome,
  createLearningOutcome,
  CurriculumMutationValidationError,
  restoreLearningOutcome,
  updateLearningOutcome,
} from './curriculum-learning-outcomes.crud.service.js';

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

function sendLearningOutcomeMutationError(
  response: Response,
  error: CurriculumMutationValidationError,
): void {
  response.status(422).json({
    error: {
      code: 'CURRICULUM_MUTATION_REFERENCE_ERROR',
      message: error.message,
      details: error.details,
    },
  });
}

function sendEvaluationCriterionMutationError(
  response: Response,
  error: EvaluationCriterionMutationValidationError,
): void {
  response.status(422).json({
    error: {
      code: 'EVALUATION_CRITERION_MUTATION_REFERENCE_ERROR',
      message: error.message,
      details: error.details,
    },
  });
}

function validateLearningOutcomeId(
  rawParams: unknown,
  response: Response,
): number | null {
  const validation = learningOutcomeIdParamsSchema.safeParse(
    rawParams,
  );

  if (!validation.success) {
    sendValidationError(
      response,
      'El identificador del resultado de aprendizaje no es válido.',
      validation.error.issues,
    );

    return null;
  }

  return validation.data.id;
}

function validateEvaluationCriterionId(
  rawParams: unknown,
  response: Response,
): number | null {
  const validation = evaluationCriterionIdParamsSchema.safeParse(
    rawParams,
  );

  if (!validation.success) {
    sendValidationError(
      response,
      'El identificador del criterio de evaluación no es válido.',
      validation.error.issues,
    );

    return null;
  }

  return validation.data.id;
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

curriculumRouter.post(
  '/learning-outcomes',
  requirePermission('curriculum.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      learningOutcomeMutationSchema.safeParse(
        request.body,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los datos del resultado de aprendizaje no son válidos.',
        validation.error.issues,
      );

      return;
    }

    try {
      const learningOutcome = await createLearningOutcome(
        validation.data,
      );

      response.status(201).json({
        message:
          'El resultado de aprendizaje se ha creado correctamente.',
        learningOutcome,
      });
    } catch (error: unknown) {
      if (error instanceof CurriculumMutationValidationError) {
        sendLearningOutcomeMutationError(
          response,
          error,
        );

        return;
      }

      next(error);
    }
  },
);

curriculumRouter.put(
  '/learning-outcomes/:id',
  requirePermission('curriculum.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const id = validateLearningOutcomeId(
      request.params,
      response,
    );

    if (id === null) {
      return;
    }

    const validation =
      learningOutcomeMutationSchema.safeParse(
        request.body,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los datos del resultado de aprendizaje no son válidos.',
        validation.error.issues,
      );

      return;
    }

    try {
      const learningOutcome = await updateLearningOutcome(
        id,
        validation.data,
      );

      response.status(200).json({
        message:
          'El resultado de aprendizaje se ha actualizado correctamente.',
        learningOutcome,
      });
    } catch (error: unknown) {
      if (error instanceof CurriculumMutationValidationError) {
        sendLearningOutcomeMutationError(
          response,
          error,
        );

        return;
      }

      next(error);
    }
  },
);

curriculumRouter.delete(
  '/learning-outcomes/:id',
  requirePermission('curriculum.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const id = validateLearningOutcomeId(
      request.params,
      response,
    );

    if (id === null) {
      return;
    }

    try {
      const learningOutcome = await archiveLearningOutcome(id);

      response.status(200).json({
        message:
          'El resultado de aprendizaje se ha archivado correctamente.',
        learningOutcome,
      });
    } catch (error: unknown) {
      if (error instanceof CurriculumMutationValidationError) {
        sendLearningOutcomeMutationError(
          response,
          error,
        );

        return;
      }

      next(error);
    }
  },
);

curriculumRouter.patch(
  '/learning-outcomes/:id/restore',
  requirePermission('curriculum.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const id = validateLearningOutcomeId(
      request.params,
      response,
    );

    if (id === null) {
      return;
    }

    try {
      const learningOutcome = await restoreLearningOutcome(id);

      response.status(200).json({
        message:
          'El resultado de aprendizaje se ha restaurado correctamente.',
        learningOutcome,
      });
    } catch (error: unknown) {
      if (error instanceof CurriculumMutationValidationError) {
        sendLearningOutcomeMutationError(
          response,
          error,
        );

        return;
      }

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

curriculumRouter.post(
  '/evaluation-criteria',
  requirePermission('curriculum.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      evaluationCriterionMutationSchema.safeParse(
        request.body,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los datos del criterio de evaluación no son válidos.',
        validation.error.issues,
      );

      return;
    }

    try {
      const evaluationCriterion = await createEvaluationCriterion(
        validation.data,
      );

      response.status(201).json({
        message:
          'El criterio de evaluación se ha creado correctamente.',
        evaluationCriterion,
      });
    } catch (error: unknown) {
      if (error instanceof EvaluationCriterionMutationValidationError) {
        sendEvaluationCriterionMutationError(
          response,
          error,
        );

        return;
      }

      next(error);
    }
  },
);

curriculumRouter.put(
  '/evaluation-criteria/:id',
  requirePermission('curriculum.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const id = validateEvaluationCriterionId(
      request.params,
      response,
    );

    if (id === null) {
      return;
    }

    const validation =
      evaluationCriterionMutationSchema.safeParse(
        request.body,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los datos del criterio de evaluación no son válidos.',
        validation.error.issues,
      );

      return;
    }

    try {
      const evaluationCriterion = await updateEvaluationCriterion(
        id,
        validation.data,
      );

      response.status(200).json({
        message:
          'El criterio de evaluación se ha actualizado correctamente.',
        evaluationCriterion,
      });
    } catch (error: unknown) {
      if (error instanceof EvaluationCriterionMutationValidationError) {
        sendEvaluationCriterionMutationError(
          response,
          error,
        );

        return;
      }

      next(error);
    }
  },
);

curriculumRouter.delete(
  '/evaluation-criteria/:id',
  requirePermission('curriculum.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const id = validateEvaluationCriterionId(
      request.params,
      response,
    );

    if (id === null) {
      return;
    }

    try {
      const evaluationCriterion = await archiveEvaluationCriterion(id);

      response.status(200).json({
        message:
          'El criterio de evaluación se ha archivado correctamente.',
        evaluationCriterion,
      });
    } catch (error: unknown) {
      if (error instanceof EvaluationCriterionMutationValidationError) {
        sendEvaluationCriterionMutationError(
          response,
          error,
        );

        return;
      }

      next(error);
    }
  },
);

curriculumRouter.patch(
  '/evaluation-criteria/:id/restore',
  requirePermission('curriculum.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const id = validateEvaluationCriterionId(
      request.params,
      response,
    );

    if (id === null) {
      return;
    }

    try {
      const evaluationCriterion = await restoreEvaluationCriterion(id);

      response.status(200).json({
        message:
          'El criterio de evaluación se ha restaurado correctamente.',
        evaluationCriterion,
      });
    } catch (error: unknown) {
      if (error instanceof EvaluationCriterionMutationValidationError) {
        sendEvaluationCriterionMutationError(
          response,
          error,
        );

        return;
      }

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
