import {
  Router,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  companyIdParamsSchema,
  createCompanySchema,
  createCompanyTutorSchema,
  createWorkPlacementSchema,
  entityIdParamsSchema,
  listCompaniesQuerySchema,
  listCompanyTutorsQuerySchema,
  listWorkPlacementsQuerySchema,
  updateCompanySchema,
  updateCompanyTutorSchema,
  updateWorkPlacementSchema,
} from './company-training.schemas.js';

import {
  archiveCompany,
  archiveCompanyTutor,
  archiveWorkPlacement,
  CompanyTrainingError,
  createCompany,
  createCompanyTutor,
  createWorkPlacement,
  getCompanyById,
  getCompanyTrainingSummary,
  getWorkPlacementById,
  listCompanies,
  listCompanyTutors,
  listWorkPlacements,
  restoreCompany,
  updateCompany,
  updateCompanyTutor,
  updateWorkPlacement,
} from './company-training.service.js';

export const companyTrainingRouter = Router();

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
      details:
        getValidationDetails(issues),
    },
  });
}

function sendKnownCompanyTrainingError(
  error: CompanyTrainingError,
  response: Response,
): void {
  response
    .status(error.statusCode)
    .json({
      error: {
        code: error.code,
        message: error.message,
        details: error.field
          ? [
              {
                field: error.field,
                message: error.message,
              },
            ]
          : undefined,
      },
    });
}

companyTrainingRouter.get(
  '/summary',
  requirePermission('company-training.view'),
  async (
    _request,
    response,
    next,
  ): Promise<void> => {
    try {
      const summary =
        await getCompanyTrainingSummary();

      response.status(200).json({
        summary,
      });
    } catch (error: unknown) {
      next(error);
    }
  },
);

companyTrainingRouter.get(
  '/companies',
  requirePermission('company-training.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      listCompaniesQuerySchema.safeParse(
        request.query,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los filtros enviados para consultar empresas no son válidos.',
        validation.error.issues,
      );

      return;
    }

    try {
      const result =
        await listCompanies(
          validation.data,
        );

      response.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);

companyTrainingRouter.post(
  '/companies',
  requirePermission('company-training.companies.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      createCompanySchema.safeParse(
        request.body,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los datos de la empresa no son válidos.',
        validation.error.issues,
      );

      return;
    }

    try {
      const company =
        await createCompany(
          validation.data,
        );

      response.status(201).json({
        message:
          'La empresa se ha creado correctamente.',
        company,
      });
    } catch (error: unknown) {
      if (
        error instanceof CompanyTrainingError
      ) {
        sendKnownCompanyTrainingError(
          error,
          response,
        );

        return;
      }

      next(error);
    }
  },
);

companyTrainingRouter.post(
  '/companies/:id/restore',
  requirePermission('company-training.companies.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      entityIdParamsSchema.safeParse(
        request.params,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'El identificador de la empresa no es válido.',
        validation.error.issues,
      );

      return;
    }

    try {
      const company =
        await restoreCompany(
          validation.data.id,
        );

      response.status(200).json({
        message:
          'La empresa se ha restaurado correctamente.',
        company,
      });
    } catch (error: unknown) {
      if (
        error instanceof CompanyTrainingError
      ) {
        sendKnownCompanyTrainingError(
          error,
          response,
        );

        return;
      }

      next(error);
    }
  },
);

companyTrainingRouter.get(
  '/companies/:id',
  requirePermission('company-training.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      entityIdParamsSchema.safeParse(
        request.params,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'El identificador de la empresa no es válido.',
        validation.error.issues,
      );

      return;
    }

    try {
      const company =
        await getCompanyById(
          validation.data.id,
        );

      response.status(200).json({
        company,
      });
    } catch (error: unknown) {
      if (
        error instanceof CompanyTrainingError
      ) {
        sendKnownCompanyTrainingError(
          error,
          response,
        );

        return;
      }

      next(error);
    }
  },
);

companyTrainingRouter.put(
  '/companies/:id',
  requirePermission('company-training.companies.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const paramsValidation =
      entityIdParamsSchema.safeParse(
        request.params,
      );

    if (!paramsValidation.success) {
      sendValidationError(
        response,
        'El identificador de la empresa no es válido.',
        paramsValidation.error.issues,
      );

      return;
    }

    const bodyValidation =
      updateCompanySchema.safeParse(
        request.body,
      );

    if (!bodyValidation.success) {
      sendValidationError(
        response,
        'Los datos de la empresa no son válidos.',
        bodyValidation.error.issues,
      );

      return;
    }

    try {
      const company =
        await updateCompany(
          paramsValidation.data.id,
          bodyValidation.data,
        );

      response.status(200).json({
        message:
          'La empresa se ha actualizado correctamente.',
        company,
      });
    } catch (error: unknown) {
      if (
        error instanceof CompanyTrainingError
      ) {
        sendKnownCompanyTrainingError(
          error,
          response,
        );

        return;
      }

      next(error);
    }
  },
);

companyTrainingRouter.delete(
  '/companies/:id',
  requirePermission('company-training.companies.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      entityIdParamsSchema.safeParse(
        request.params,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'El identificador de la empresa no es válido.',
        validation.error.issues,
      );

      return;
    }

    try {
      const company =
        await archiveCompany(
          validation.data.id,
        );

      response.status(200).json({
        message:
          'La empresa se ha archivado correctamente.',
        company,
      });
    } catch (error: unknown) {
      if (
        error instanceof CompanyTrainingError
      ) {
        sendKnownCompanyTrainingError(
          error,
          response,
        );

        return;
      }

      next(error);
    }
  },
);

companyTrainingRouter.get(
  '/companies/:companyId/tutors',
  requirePermission('company-training.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const paramsValidation =
      companyIdParamsSchema.safeParse(
        request.params,
      );

    if (!paramsValidation.success) {
      sendValidationError(
        response,
        'El identificador de la empresa no es válido.',
        paramsValidation.error.issues,
      );

      return;
    }

    const queryValidation =
      listCompanyTutorsQuerySchema.safeParse(
        request.query,
      );

    if (!queryValidation.success) {
      sendValidationError(
        response,
        'Los filtros enviados para consultar tutores laborales no son válidos.',
        queryValidation.error.issues,
      );

      return;
    }

    try {
      const result =
        await listCompanyTutors(
          paramsValidation.data.companyId,
          queryValidation.data,
        );

      response.status(200).json(result);
    } catch (error: unknown) {
      if (
        error instanceof CompanyTrainingError
      ) {
        sendKnownCompanyTrainingError(
          error,
          response,
        );

        return;
      }

      next(error);
    }
  },
);

companyTrainingRouter.post(
  '/companies/:companyId/tutors',
  requirePermission('company-training.tutors.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const paramsValidation =
      companyIdParamsSchema.safeParse(
        request.params,
      );

    if (!paramsValidation.success) {
      sendValidationError(
        response,
        'El identificador de la empresa no es válido.',
        paramsValidation.error.issues,
      );

      return;
    }

    const bodyValidation =
      createCompanyTutorSchema.safeParse(
        request.body,
      );

    if (!bodyValidation.success) {
      sendValidationError(
        response,
        'Los datos del tutor laboral no son válidos.',
        bodyValidation.error.issues,
      );

      return;
    }

    try {
      const companyTutor =
        await createCompanyTutor(
          paramsValidation.data.companyId,
          bodyValidation.data,
        );

      response.status(201).json({
        message:
          'El tutor laboral se ha creado correctamente.',
        companyTutor,
      });
    } catch (error: unknown) {
      if (
        error instanceof CompanyTrainingError
      ) {
        sendKnownCompanyTrainingError(
          error,
          response,
        );

        return;
      }

      next(error);
    }
  },
);

companyTrainingRouter.put(
  '/company-tutors/:id',
  requirePermission('company-training.tutors.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const paramsValidation =
      entityIdParamsSchema.safeParse(
        request.params,
      );

    if (!paramsValidation.success) {
      sendValidationError(
        response,
        'El identificador del tutor laboral no es válido.',
        paramsValidation.error.issues,
      );

      return;
    }

    const bodyValidation =
      updateCompanyTutorSchema.safeParse(
        request.body,
      );

    if (!bodyValidation.success) {
      sendValidationError(
        response,
        'Los datos del tutor laboral no son válidos.',
        bodyValidation.error.issues,
      );

      return;
    }

    try {
      const companyTutor =
        await updateCompanyTutor(
          paramsValidation.data.id,
          bodyValidation.data,
        );

      response.status(200).json({
        message:
          'El tutor laboral se ha actualizado correctamente.',
        companyTutor,
      });
    } catch (error: unknown) {
      if (
        error instanceof CompanyTrainingError
      ) {
        sendKnownCompanyTrainingError(
          error,
          response,
        );

        return;
      }

      next(error);
    }
  },
);

companyTrainingRouter.delete(
  '/company-tutors/:id',
  requirePermission('company-training.tutors.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      entityIdParamsSchema.safeParse(
        request.params,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'El identificador del tutor laboral no es válido.',
        validation.error.issues,
      );

      return;
    }

    try {
      const companyTutor =
        await archiveCompanyTutor(
          validation.data.id,
        );

      response.status(200).json({
        message:
          'El tutor laboral se ha archivado correctamente.',
        companyTutor,
      });
    } catch (error: unknown) {
      if (
        error instanceof CompanyTrainingError
      ) {
        sendKnownCompanyTrainingError(
          error,
          response,
        );

        return;
      }

      next(error);
    }
  },
);

companyTrainingRouter.get(
  '/placements',
  requirePermission('company-training.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      listWorkPlacementsQuerySchema.safeParse(
        request.query,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los filtros enviados para consultar formación en empresa no son válidos.',
        validation.error.issues,
      );

      return;
    }

    try {
      const result =
        await listWorkPlacements(
          validation.data,
        );

      response.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);

companyTrainingRouter.post(
  '/placements',
  requirePermission('company-training.placements.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      createWorkPlacementSchema.safeParse(
        request.body,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'Los datos de la estancia formativa no son válidos.',
        validation.error.issues,
      );

      return;
    }

    try {
      const workPlacement =
        await createWorkPlacement(
          validation.data,
        );

      response.status(201).json({
        message:
          'La estancia formativa se ha creado correctamente.',
        workPlacement,
      });
    } catch (error: unknown) {
      if (
        error instanceof CompanyTrainingError
      ) {
        sendKnownCompanyTrainingError(
          error,
          response,
        );

        return;
      }

      next(error);
    }
  },
);

companyTrainingRouter.get(
  '/placements/:id',
  requirePermission('company-training.view'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      entityIdParamsSchema.safeParse(
        request.params,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'El identificador de la estancia formativa no es válido.',
        validation.error.issues,
      );

      return;
    }

    try {
      const workPlacement =
        await getWorkPlacementById(
          validation.data.id,
        );

      response.status(200).json({
        workPlacement,
      });
    } catch (error: unknown) {
      if (
        error instanceof CompanyTrainingError
      ) {
        sendKnownCompanyTrainingError(
          error,
          response,
        );

        return;
      }

      next(error);
    }
  },
);

companyTrainingRouter.put(
  '/placements/:id',
  requirePermission('company-training.placements.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const paramsValidation =
      entityIdParamsSchema.safeParse(
        request.params,
      );

    if (!paramsValidation.success) {
      sendValidationError(
        response,
        'El identificador de la estancia formativa no es válido.',
        paramsValidation.error.issues,
      );

      return;
    }

    const bodyValidation =
      updateWorkPlacementSchema.safeParse(
        request.body,
      );

    if (!bodyValidation.success) {
      sendValidationError(
        response,
        'Los datos de la estancia formativa no son válidos.',
        bodyValidation.error.issues,
      );

      return;
    }

    try {
      const workPlacement =
        await updateWorkPlacement(
          paramsValidation.data.id,
          bodyValidation.data,
        );

      response.status(200).json({
        message:
          'La estancia formativa se ha actualizado correctamente.',
        workPlacement,
      });
    } catch (error: unknown) {
      if (
        error instanceof CompanyTrainingError
      ) {
        sendKnownCompanyTrainingError(
          error,
          response,
        );

        return;
      }

      next(error);
    }
  },
);

companyTrainingRouter.delete(
  '/placements/:id',
  requirePermission('company-training.placements.manage'),
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    const validation =
      entityIdParamsSchema.safeParse(
        request.params,
      );

    if (!validation.success) {
      sendValidationError(
        response,
        'El identificador de la estancia formativa no es válido.',
        validation.error.issues,
      );

      return;
    }

    try {
      const workPlacement =
        await archiveWorkPlacement(
          validation.data.id,
        );

      response.status(200).json({
        message:
          'La estancia formativa se ha archivado correctamente.',
        workPlacement,
      });
    } catch (error: unknown) {
      if (
        error instanceof CompanyTrainingError
      ) {
        sendKnownCompanyTrainingError(
          error,
          response,
        );

        return;
      }

      next(error);
    }
  },
);
