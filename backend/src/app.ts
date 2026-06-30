import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';

import { prisma } from './config/database.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use(
    express.json({
      limit: '1mb',
    }),
  );

  app.get(
    '/api/health',
    async (
      _request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        await prisma.$queryRaw`SELECT 1`;

        response.status(200).json({
          status: 'ok',
          service: 'safa-twin-api',
          database: 'connected',
        });
      } catch (error: unknown) {
        next(error);
      }
    },
  );

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);

  app.use((request: Request, response: Response) => {
    response.status(404).json({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message:
          'La ruta solicitada no existe.',
        path: request.originalUrl,
      },
    });
  });

  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      _next: NextFunction,
    ) => {
      console.error(
        'Error no controlado:',
        error,
      );

      response.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message:
            'Se ha producido un error interno.',
        },
      });
    },
  );

  return app;
}