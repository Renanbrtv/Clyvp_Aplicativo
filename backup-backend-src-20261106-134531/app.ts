import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { globalRateLimiter } from './middleware/rate-limit';
import { requestLogger } from './middleware/request-logger';
import { apiRoutes } from './routes';
import { healthController } from './controllers/health.controller';
import { asyncHandler } from './utils/http';

/**
 * Monta a aplicacao Express.
 * Separado de server.ts para permitir testes sem abrir uma porta.
 */
export function createApp(): Express {
  const app = express();

  // Confia no proxy reverso (nginx, Railway, Render...) para IP e rate limit.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // --- Seguranca e infraestrutura ---
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins === '*' ? true : env.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(requestLogger);
  app.use(globalRateLimiter);

  // --- Rotas ---
  app.get('/health', asyncHandler(healthController.check));
  app.use(env.API_PREFIX, apiRoutes);

  // --- Fallbacks ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
