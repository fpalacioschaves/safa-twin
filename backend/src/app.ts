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
  assessmentSchemesRouter,
} from './modules/assessment-schemes/assessment-schemes.routes.js';

import {
  authRouter,
} from './modules/auth/auth.routes.js';

import {
  centresRouter,
} from './modules/centres/centres.routes.js';

import {
  companyTrainingRouter,
} from './modules/company-training/company-training.routes.js';

import {
  enrolmentsRouter,
} from './modules/enrolments/enrolments.routes.js';

import {
  evaluationsRouter,
} from './modules/evaluations/evaluations.routes.js';

import {
  generatedDocumentsRouter,
} from './modules/generated-documents/generated-documents.routes.js';

import {
  gradeStatusesRouter,
} from './modules/grade-statuses/grade-statuses.routes.js';

import {
  gradesRouter,
} from './modules/grades/grades.routes.js';

import {
  modulesRouter,
} from './modules/modules/modules.routes.js';

import {
  statisticsRouter,
} from './modules/statistics/statistics.routes.js';

import {
  studentsRouter,
} from './modules/students/students.routes.js';

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
    '/api/students',
    studentsRouter,
  );

  app.use(
    '/api/enrolments',
    enrolmentsRouter,
  );

  app.use(
    '/api/evaluations',
    evaluationsRouter,
  );

  app.use(
    '/api/assessment-schemes',
    assessmentSchemesRouter,
  );

  app.use(
    '/api/grade-statuses',
    gradeStatusesRouter,
  );

  app.use(
    '/api/grades',
    gradesRouter,
  );

  app.use(
    '/api/statistics',
    statisticsRouter,
  );

  app.use(
    '/api/generated-documents',
    generatedDocumentsRouter,
  );

  app.use(
    '/api/company-training',
    companyTrainingRouter,
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
