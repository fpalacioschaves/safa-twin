import {
  Router,
  type Request,
  type Response,
} from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdParamsSchema,
} from './users.schemas.js';

import {
  archiveUser,
  CannotArchiveOwnUserError,
  CannotDeactivateOwnUserError,
  CannotModifyOwnRolesError,
  CannotRemoveLastAdministratorError,
  CannotResetOwnPasswordError,
  createUser,
  getUserById,
  listAssignableRoles,
  listUsers,
  restoreUser,
  setUserActiveStatus,
  updateUser,
  UserAlreadyArchivedError,
  UserArchivedError,
  UserEmailAlreadyExistsError,
  UserNotArchivedError,
  UserNotFoundError,
  UserRolesNotFoundError,
} from './users.service.js';

export const usersRouter = Router();

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

function getAuthenticatedUserId(
  response: Response,
): number {
  const authenticatedUser =
    response.locals.authenticatedUser;

  if (
    typeof authenticatedUser !== 'object'
    || authenticatedUser === null
    || typeof authenticatedUser.id
    !== 'number'
  ) {
    throw new Error(
      'No se ha podido recuperar el usuario autenticado.',
    );
  }

  return authenticatedUser.id;
}

function getValidatedUserId(
  request: Request,
  response: Response,
): number | null {
  const validation =
    userIdParamsSchema.safeParse(
      request.params,
    );

  if (!validation.success) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message:
          'El identificador del usuario no es válido.',

        details: getValidationDetails(
          validation.error.issues,
        ),
      },
    });

    return null;
  }

  return validation.data.id;
}

function handleKnownUserError(
  error: unknown,
  response: Response,
): boolean {
  if (
    error
    instanceof UserEmailAlreadyExistsError
  ) {
    response.status(409).json({
      error: {
        code:
          'USER_EMAIL_ALREADY_EXISTS',

        message: error.message,

        details: [
          {
            field: 'email',
            message: error.message,
          },
        ],
      },
    });

    return true;
  }

  if (
    error
    instanceof UserRolesNotFoundError
  ) {
    response.status(422).json({
      error: {
        code:
          'USER_ROLES_NOT_FOUND',

        message: error.message,

        details: [
          {
            field: 'roleIds',

            message:
              `Roles inexistentes: ${error.missingRoleIds.join(', ')}.`,
          },
        ],
      },
    });

    return true;
  }

  if (error instanceof UserNotFoundError) {
    response.status(404).json({
      error: {
        code: 'USER_NOT_FOUND',
        message: error.message,
      },
    });

    return true;
  }

  if (error instanceof UserArchivedError) {
    response.status(409).json({
      error: {
        code: 'USER_ARCHIVED',
        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof UserAlreadyArchivedError
  ) {
    response.status(409).json({
      error: {
        code: 'USER_ALREADY_ARCHIVED',
        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof UserNotArchivedError
  ) {
    response.status(409).json({
      error: {
        code: 'USER_NOT_ARCHIVED',
        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof CannotModifyOwnRolesError
  ) {
    response.status(409).json({
      error: {
        code:
          'CANNOT_MODIFY_OWN_ROLES',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof CannotResetOwnPasswordError
  ) {
    response.status(409).json({
      error: {
        code:
          'CANNOT_RESET_OWN_PASSWORD',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof CannotDeactivateOwnUserError
  ) {
    response.status(409).json({
      error: {
        code:
          'CANNOT_DEACTIVATE_OWN_USER',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof CannotArchiveOwnUserError
  ) {
    response.status(409).json({
      error: {
        code:
          'CANNOT_ARCHIVE_OWN_USER',

        message: error.message,
      },
    });

    return true;
  }

  if (
    error
    instanceof CannotRemoveLastAdministratorError
  ) {
    response.status(409).json({
      error: {
        code:
          'CANNOT_REMOVE_LAST_ADMINISTRATOR',

        message: error.message,
      },
    });

    return true;
  }

  return false;
}

usersRouter.get(
  '/roles',
  requirePermission('roles.list'),
  async (_request, response, next) => {
    try {
      const result =
        await listAssignableRoles();

      response
        .status(200)
        .json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);

usersRouter.get(
  '/',
  requirePermission('users.list'),
  async (request, response, next) => {
    try {
      const validation =
        listUsersQuerySchema.safeParse(
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

      const result = await listUsers(
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

usersRouter.post(
  '/',
  requirePermission('users.create'),
  requirePermission('roles.assign'),
  async (request, response, next) => {
    try {
      const validation =
        createUserSchema.safeParse(
          request.body,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Los datos del usuario no son válidos.',

            details: getValidationDetails(
              validation.error.issues,
            ),
          },
        });

        return;
      }

      const user = await createUser(
        validation.data,
      );

      response.status(201).json({
        message:
          'El usuario se ha creado correctamente.',

        user,
      });
    } catch (error: unknown) {
      if (
        handleKnownUserError(
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

usersRouter.post(
  '/:id/restore',
  requirePermission('users.archive'),
  async (request, response, next) => {
    try {
      const userId = getValidatedUserId(
        request,
        response,
      );

      if (userId === null) {
        return;
      }

      const user = await restoreUser(
        userId,
      );

      response.status(200).json({
        message:
          'El usuario se ha restaurado correctamente.',

        user,
      });
    } catch (error: unknown) {
      if (
        handleKnownUserError(
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

usersRouter.patch(
  '/:id/status',
  requirePermission('users.update'),
  async (request, response, next) => {
    try {
      const userId = getValidatedUserId(
        request,
        response,
      );

      if (userId === null) {
        return;
      }

      const validation =
        updateUserStatusSchema.safeParse(
          request.body,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'El estado enviado no es válido.',

            details: getValidationDetails(
              validation.error.issues,
            ),
          },
        });

        return;
      }

      const authenticatedUserId =
        getAuthenticatedUserId(response);

      const user =
        await setUserActiveStatus(
          authenticatedUserId,
          userId,
          validation.data.isActive,
        );

      response.status(200).json({
        message: validation.data.isActive
          ? 'El usuario se ha activado correctamente.'
          : 'El usuario se ha desactivado correctamente.',

        user,
      });
    } catch (error: unknown) {
      if (
        handleKnownUserError(
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

usersRouter.get(
  '/:id',
  requirePermission('users.view'),
  async (request, response, next) => {
    try {
      const userId = getValidatedUserId(
        request,
        response,
      );

      if (userId === null) {
        return;
      }

      const user = await getUserById(
        userId,
      );

      response.status(200).json({
        user,
      });
    } catch (error: unknown) {
      if (
        handleKnownUserError(
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

usersRouter.put(
  '/:id',
  requirePermission('users.update'),
  requirePermission('roles.assign'),
  async (request, response, next) => {
    try {
      const userId = getValidatedUserId(
        request,
        response,
      );

      if (userId === null) {
        return;
      }

      const validation =
        updateUserSchema.safeParse(
          request.body,
        );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Los datos del usuario no son válidos.',

            details: getValidationDetails(
              validation.error.issues,
            ),
          },
        });

        return;
      }

      const authenticatedUserId =
        getAuthenticatedUserId(response);

      const user = await updateUser(
        authenticatedUserId,
        userId,
        validation.data,
      );

      response.status(200).json({
        message:
          'El usuario se ha actualizado correctamente.',

        user,
      });
    } catch (error: unknown) {
      if (
        handleKnownUserError(
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

usersRouter.delete(
  '/:id',
  requirePermission('users.archive'),
  async (request, response, next) => {
    try {
      const userId = getValidatedUserId(
        request,
        response,
      );

      if (userId === null) {
        return;
      }

      const authenticatedUserId =
        getAuthenticatedUserId(response);

      const user = await archiveUser(
        authenticatedUserId,
        userId,
      );

      response.status(200).json({
        message:
          'El usuario se ha archivado correctamente.',

        user,
      });
    } catch (error: unknown) {
      if (
        handleKnownUserError(
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