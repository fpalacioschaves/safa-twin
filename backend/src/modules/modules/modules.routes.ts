import {
  Router,
  type Request,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  createModuleSchema,
  listModulesQuerySchema,
  moduleIdParamsSchema,
  updateModuleSchema,
} from './modules.schemas.js';

import {
  archiveModule,
  createModule,
  getModuleById,
  listModules,
  ModuleAcademicLevelNotFoundError,
  ModuleAcademicLevelUnavailableError,
  ModuleAlreadyArchivedError,
  ModuleArchivedError,
  ModuleAssignmentChangeRequiresInactiveError,
  ModuleCodeAlreadyExistsError,
  ModuleNotArchivedError,
  ModuleNotFoundError,
  ModuleProgrammeNotFoundError,
  ModuleProgrammeUnavailableError,
  restoreModule,
  updateModule,
} from './modules.service.js';

export const modulesRouter = Router();

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

function getValidatedModuleId(
  request: Request,
  response: Response,
): number | null {
  const validation =
    moduleIdParamsSchema.safeParse(
      request.params,
    );

  if (!validation.success) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',

        message:
          'El identificador del módulo no es válido.',

        details: getValidationDetails(
          validation.error.issues,
        ),
      },
    });

    return null;
  }

  return validation.data.id;
}

function handleKnownModuleError(
  error: unknown,
  response: Response,
): boolean {
  if (
    error
    instanceof ModuleCodeAlreadyExistsError
  ) {
    response.status(409).json({
      error: {
        code:
          'MODULE_CODE_ALREADY_EXISTS',

        message: error.message,

        details: [
          {
            field: 'code',
            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error instanceof ModuleNotFoundError
  ) {
    response.status(404).json({
      error: {
        code: 'MODULE_NOT_FOUND',
        message: error.message,
      },
    });

    return true;
  }

  if (
    error instanceof ModuleArchivedError
  ) {
    response.status(409).json({
      error: {
        code: 'MODULE_ARCHIVED',
        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof ModuleAlreadyArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'MODULE_ALREADY_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error instanceof ModuleNotArchivedError
  ) {
    response.status(409).json({
      error: {
        code:
          'MODULE_NOT_ARCHIVED',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof ModuleProgrammeNotFoundError
  ) {
    response.status(422).json({
      error: {
        code:
          'MODULE_PROGRAMME_NOT_FOUND',

        message: error.message,

        details: [
          {
            field:
              'vocationalProgrammeId',

            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof ModuleProgrammeUnavailableError
  ) {
    response.status(409).json({
      error: {
        code:
          'MODULE_PROGRAMME_UNAVAILABLE',

        message: error.message,

        details: [
          {
            field:
              'vocationalProgrammeId',

            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof ModuleAcademicLevelNotFoundError
  ) {
    response.status(422).json({
      error: {
        code:
          'MODULE_ACADEMIC_LEVEL_NOT_FOUND',

        message: error.message,

        details: [
          {
            field:
              'academicLevelId',

            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof ModuleAcademicLevelUnavailableError
  ) {
    response.status(409).json({
      error: {
        code:
          'MODULE_ACADEMIC_LEVEL_UNAVAILABLE',

        message: error.message,

        details: [
          {
            field:
              'academicLevelId',

            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof ModuleAssignmentChangeRequiresInactiveError
  ) {
    response.status(409).json({
      error: {
        code:
          'MODULE_ASSIGNMENT_CHANGE_REQUIRES_INACTIVE',

        message: error.message,

        details: [
          {
            field:
              'vocationalProgrammeId',

            message:
              'Desactiva primero el módulo antes de cambiar su ciclo o nivel.',
          },

          {
            field:
              'academicLevelId',

            message:
              'Desactiva primero el módulo antes de cambiar su ciclo o nivel.',
          },
        ],
      },
    });

    return true;
  }

  return false;
}

modulesRouter.get(
  '/',
  requirePermission('modules.list'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        listModulesQuerySchema.safeParse(
          request.query,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los filtros enviados no son válidos.',

            details: getValidationDetails(
              validation.error.issues,
            ),
          },
        });

        return;
      }

      const result = await listModules(
        validation.data,
      );

      response
        .status(200)
        .json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);

modulesRouter.post(
  '/',
  requirePermission('modules.create'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const validation =
        createModuleSchema.safeParse(
          request.body,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos del módulo no son válidos.',

            details: getValidationDetails(
              validation.error.issues,
            ),
          },
        });

        return;
      }

      const module = await createModule(
        validation.data,
      );

      response.status(201).json({
        message:
          'El módulo se ha creado correctamente.',

        module,
      });
    } catch (error: unknown) {
      if (
        handleKnownModuleError(
          error,
          response,
        )
      ) {
        return;
      }

      next(error);
    }
  },
);

modulesRouter.post(
  '/:id/restore',
  requirePermission('modules.archive'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const moduleId =
        getValidatedModuleId(
          request,
          response,
        );

      if (moduleId === null) {
        return;
      }

      const module = await restoreModule(
        moduleId,
      );

      response.status(200).json({
        message:
          'El módulo se ha restaurado correctamente.',

        module,
      });
    } catch (error: unknown) {
      if (
        handleKnownModuleError(
          error,
          response,
        )
      ) {
        return;
      }

      next(error);
    }
  },
);

modulesRouter.get(
  '/:id',
  requirePermission('modules.view'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const moduleId =
        getValidatedModuleId(
          request,
          response,
        );

      if (moduleId === null) {
        return;
      }

      const module = await getModuleById(
        moduleId,
      );

      response.status(200).json({
        module,
      });
    } catch (error: unknown) {
      if (
        handleKnownModuleError(
          error,
          response,
        )
      ) {
        return;
      }

      next(error);
    }
  },
);

modulesRouter.put(
  '/:id',
  requirePermission('modules.update'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const moduleId =
        getValidatedModuleId(
          request,
          response,
        );

      if (moduleId === null) {
        return;
      }

      const validation =
        updateModuleSchema.safeParse(
          request.body,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Los datos del módulo no son válidos.',

            details: getValidationDetails(
              validation.error.issues,
            ),
          },
        });

        return;
      }

      const module = await updateModule(
        moduleId,
        validation.data,
      );

      response.status(200).json({
        message:
          'El módulo se ha actualizado correctamente.',

        module,
      });
    } catch (error: unknown) {
      if (
        handleKnownModuleError(
          error,
          response,
        )
      ) {
        return;
      }

      next(error);
    }
  },
);

modulesRouter.delete(
  '/:id',
  requirePermission('modules.archive'),
  async (
    request,
    response,
    next,
  ) => {
    try {
      const moduleId =
        getValidatedModuleId(
          request,
          response,
        );

      if (moduleId === null) {
        return;
      }

      const module = await archiveModule(
        moduleId,
      );

      response.status(200).json({
        message:
          'El módulo se ha archivado correctamente.',

        module,
      });
    } catch (error: unknown) {
      if (
        handleKnownModuleError(
          error,
          response,
        )
      ) {
        return;
      }

      next(error);
    }
  },
);