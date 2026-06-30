import { Router } from 'express';

import {
  requirePermission,
} from '../../middleware/authorization.middleware.js';

import {
  listUsersQuerySchema,
} from './users.schemas.js';

import {
  listUsers,
} from './users.service.js';

export const usersRouter = Router();

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

            details: validation.error.issues.map(
              (issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
              }),
            ),
          },
        });

        return;
      }

      const result = await listUsers(
        validation.data,
      );

      response.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  },
);