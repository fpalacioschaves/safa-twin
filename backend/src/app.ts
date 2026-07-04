import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';

import { prisma } from './config/database.js';

import {
  academicLevelsRouter,
} from './modules/academic-levels/academic-levels.routes.js';

import {
  academicOfferingsRouter,
} from './modules/academic-offerings/academic-offerings.routes.js';

import {
  academicYearsRouter,
} from './modules/academic-years/academic-years.routes.js';

import {
  authRouter,
} from './modules/auth/auth.routes.js';

import {
  centresRouter,
} from './modules/centres/centres.routes.js';

import {
  modulesRouter,
} from './modules/modules/modules.routes.js';

import {
  usersRouter,
} from './modules/users/users.routes.js';

import {
  vocationalProgrammesRouter,
} from './modules/vocational-programmes/vocational-programmes.routes.js';

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

  app.use(
    '/api/auth',
    authRouter,
  );

  app.use(
    '/api/users',
    usersRouter,
  );

  app.use(
    '/api/academic-years',
    academicYearsRouter,
  );

  app.use(
    '/api/centres',
    centresRouter,
  );

  app.use(
    '/api/vocational-programmes',
    vocationalProgrammesRouter,
  );

  app.use(
    '/api/academic-levels',
    academicLevelsRouter,
  );

  app.use(
    '/api/modules',
    modulesRouter,
  );

  app.use(
    '/api/academic-offerings',
    academicOfferingsRouter,
  );

  app.use(
    (
      request: Request,
      response: Response,
    ) => {
      response.status(404).json({
        error: {
          code: 'ROUTE_NOT_FOUND',

          message:
            'La ruta solicitada no existe.',

          path: request.originalUrl,
        },
      });
    },
  );

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
          code:
            'INTERNAL_SERVER_ERROR',

          message:
            'Se ha producido un error interno.',
        },
      });
    },
  );

  return app;
}