import type { Request, Response } from 'express';
import morgan from 'morgan';

import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Log de acesso HTTP.
 * Em producao usa o formato "combined"; em desenvolvimento, um formato curto.
 * Nenhum corpo de requisicao e registrado - senhas nunca vao para o log.
 *
 * Os parametros genericos apontam para os tipos do Express (e nao para os
 * tipos crus do modulo http), o que da acesso a req.originalUrl com tipagem.
 */
export const requestLogger = morgan<Request, Response>(env.isProduction ? 'combined' : 'dev', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
  skip: (req) => req.originalUrl === '/health' || req.originalUrl === `${env.API_PREFIX}/health`,
});
