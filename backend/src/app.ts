import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_request: Request, response: Response) => {
    response.status(200).json({
      status: 'ok',
      service: 'safa-twin-api',
    });
  });

  app.use((request: Request, response: Response) => {
    response.status(404).json({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'La ruta solicitada no existe.',
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
      console.error('Error no controlado:', error);

      response.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Se ha producido un error interno.',
        },
      });
    },
  );

  return app;
}