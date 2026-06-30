import { Router } from 'express';

import { getCookieValue } from '../../http/cookies.js';
import { loginSchema } from './auth.schemas.js';
import {
  authenticateUser,
  deleteSession,
  getAuthenticatedUser,
  SESSION_COOKIE_NAME,
} from './auth.service.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  async (request, response, next) => {
    try {
      const validation = loginSchema.safeParse(
        request.body,
      );

      if (!validation.success) {
        response.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Los datos enviados no son válidos.',

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

      const result = await authenticateUser(
        validation.data.email,
        validation.data.password,
      );

      if (!result) {
        response.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message:
              'El correo o la contraseña no son correctos.',
          },
        });

        return;
      }

      response.cookie(
        SESSION_COOKIE_NAME,
        result.sessionToken,
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          expires: result.expiresAt,
          path: '/',
        },
      );

      response.status(200).json({
        user: result.user,
      });
    } catch (error: unknown) {
      next(error);
    }
  },
);

authRouter.get(
  '/me',
  async (request, response, next) => {
    try {
      const sessionToken = getCookieValue(
        request.headers.cookie,
        SESSION_COOKIE_NAME,
      );

      if (!sessionToken) {
        response.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message:
              'Es necesario iniciar sesión.',
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

      response.status(200).json({
        user,
      });
    } catch (error: unknown) {
      next(error);
    }
  },
);

authRouter.post(
  '/logout',
  async (request, response, next) => {
    try {
      const sessionToken = getCookieValue(
        request.headers.cookie,
        SESSION_COOKIE_NAME,
      );

      if (sessionToken) {
        await deleteSession(sessionToken);
      }

      response.clearCookie(
        SESSION_COOKIE_NAME,
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        },
      );

      response.status(204).send();
    } catch (error: unknown) {
      next(error);
    }
  },
);