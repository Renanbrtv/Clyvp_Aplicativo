import type { Request, Response } from 'express';

import { assertDatabaseConnection } from '../config/database';
import { env } from '../config/env';
import { APP_NAME, APP_TAGLINE } from '../config/constants';

export const healthController = {
  /** GET /health - usado pelo app e pelo smoke test. */
  async check(_req: Request, res: Response) {
    let database: 'ok' | 'indisponivel' = 'ok';
    let databaseMessage: string | undefined;

    try {
      await assertDatabaseConnection();
    } catch (error) {
      database = 'indisponivel';
      databaseMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    }

    const status = database === 'ok' ? 200 : 503;

    return res.status(status).json({
      success: database === 'ok',
      data: {
        app: APP_NAME,
        tagline: APP_TAGLINE,
        version: '0.1.0',
        stage: 'Etapa 1 - autenticacao',
        environment: env.NODE_ENV,
        uptimeSeconds: Math.round(process.uptime()),
        database,
        databaseMessage,
        timestamp: new Date().toISOString(),
      },
    });
  },
};
