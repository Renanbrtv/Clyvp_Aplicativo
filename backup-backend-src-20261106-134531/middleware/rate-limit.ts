import rateLimit, { type Options } from 'express-rate-limit';

import { env } from '../config/env';

const baseOptions: Partial<Options> = {
  windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Muitas requisicoes. Aguarde alguns minutos e tente novamente.',
      },
    });
  },
};

/** Limite geral da API. */
export const globalRateLimiter = rateLimit({
  ...baseOptions,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
});

/** Limite mais rigido para login/cadastro/recuperacao (freia forca bruta). */
export const authRateLimiter = rateLimit({
  ...baseOptions,
  limit: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  skipSuccessfulRequests: false,
});
