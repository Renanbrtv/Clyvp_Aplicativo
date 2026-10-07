import type { Server } from 'node:http';

import { createApp } from './app';
import { APP_NAME, APP_TAGLINE } from './config/constants';
import { assertDatabaseConnection, closePool } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  const app = createApp();

  // Falha cedo se o MySQL nao estiver acessivel - mas nao derruba o processo:
  // o desenvolvedor pode ligar o WAMP e a API volta a funcionar sozinha.
  try {
    await assertDatabaseConnection();
    logger.info(`Conectado ao MySQL em ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
  } catch (error) {
    logger.error(
      'Nao foi possivel conectar ao MySQL. Verifique se o WAMP esta ligado e se o .env esta correto.',
      error,
    );
  }

  const server: Server = app.listen(env.PORT, () => {
    logger.info(`${APP_NAME} - ${APP_TAGLINE}`);
    logger.info(`API rodando em http://localhost:${env.PORT}${env.API_PREFIX} (${env.NODE_ENV})`);
    logger.info(`Health check: http://localhost:${env.PORT}/health`);
  });

  const shutdown = (signal: string) => {
    logger.info(`Recebido ${signal}. Encerrando o servidor...`);

    server.close(async () => {
      await closePool();
      logger.info('Servidor encerrado com seguranca.');
      process.exit(0);
    });

    // Se algo travar, forca a saida em 10 segundos.
    setTimeout(() => {
      logger.warn('Encerramento forcado apos timeout.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Promise rejeitada sem tratamento', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Excecao nao tratada - encerrando o processo', error);
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  logger.error('Falha ao iniciar o servidor', error);
  process.exit(1);
});
