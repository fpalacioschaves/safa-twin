import type {
  RequestHandler,
} from 'express';

import { getCookieValue } from '../http/cookies.js';

import {
  getAuthenticatedUser,
  SESSION_COOKIE_NAME,
} from '../modules/auth/auth.service.js';

export function requirePermission(
  permissionSlug: string,
): RequestHandler {
  return async (
    request,
    response,
    next,
  ): Promise<void> => {
    try {
      const sessionToken = getCookieValue(
        request.headers.cookie,
        SESSION_COOKIE_NAME,
      );

      if (!sessionToken) {
        response.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Es necesario iniciar sesión.',
          },
        });

        return;
      }

      const user = await getAuthenticatedUser(
        sessionToken,
      );

      if (!user) {
        response.status(401).json({
          error: {
            code: 'INVALID_SESSION',
            message:
              'La sesión no existe o ha caducado.',
          },
        });

        return;
      }

      if (
        !user.permissions.includes(permissionSlug)
      ) {
        response.status(403).json({
          error: {
            code: 'PERMISSION_DENIED',
            message:
              'No tienes permiso para realizar esta operación.',
          },
        });

        return;
      }

      next();
    } catch (error: unknown) {
      next(error);
    }
  };
}