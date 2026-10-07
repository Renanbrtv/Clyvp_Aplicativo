/**
 * Cria o banco de dados e aplica o schema (database/schema.sql).
 *
 *   npm run db:migrate           -> cria o que estiver faltando (seguro, idempotente)
 *   npm run db:migrate -- --force -> APAGA o banco inteiro e recria do zero
 *
 * O nome do banco vem do .env (DB_NAME); o schema.sql e reescrito em
 * memoria para usar esse nome, entao voce pode ter "clyvo" e "clyvo_test"
 * lado a lado no mesmo MySQL.
 */
import fs from 'node:fs';
import path from 'node:path';

import { createServerPool } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const SCHEMA_PATH = path.resolve(process.cwd(), '..', 'database', 'schema.sql');
const FALLBACK_SCHEMA_PATH = path.resolve(process.cwd(), 'database', 'schema.sql');

async function main(): Promise<void> {
  const force = process.argv.includes('--force') || process.argv.includes('--drop');
  const schemaPath = fs.existsSync(SCHEMA_PATH) ? SCHEMA_PATH : FALLBACK_SCHEMA_PATH;

  if (!fs.existsSync(schemaPath)) {
    logger.error(
      `Arquivo schema.sql nao encontrado. Procurei em:\n  - ${SCHEMA_PATH}\n  - ${FALLBACK_SCHEMA_PATH}`,
    );
    process.exit(1);
  }

  const rawSchema = fs.readFileSync(schemaPath, 'utf8');
  const schema = applyDatabaseName(rawSchema, env.DB_NAME);

  const pool = createServerPool();

  try {
    logger.info(`Conectando em ${env.DB_USER}@${env.DB_HOST}:${env.DB_PORT}...`);
    const connection = await pool.getConnection();

    try {
      if (force) {
        logger.warn(`--force informado: removendo o banco "${env.DB_NAME}"...`);
        await connection.query(`DROP DATABASE IF EXISTS \`${env.DB_NAME}\``);
      }

      logger.info(`Aplicando schema em "${env.DB_NAME}"...`);
      await connection.query(schema);
      const marketplacePath = path.join(path.dirname(schemaPath), 'marketplace.sql');
      if (fs.existsSync(marketplacePath)) await connection.query(fs.readFileSync(marketplacePath, 'utf8'));

      await connection.query(`USE \`${env.DB_NAME}\``);
      const [tables] = await connection.query<any[]>('SHOW TABLES');

      logger.info(`Schema aplicado. ${tables.length} tabelas disponiveis:`);
      tables.forEach((row) => {
        const name = Object.values(row)[0];
        logger.info(`  - ${name}`);
      });

      logger.info('Migration concluida. Proximo passo: npm run db:seed');
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('Falha ao aplicar o schema.', error);
    printTroubleshooting(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

/** Substitui o nome fixo "clyvo" do schema pelo DB_NAME configurado. */
function applyDatabaseName(schema: string, databaseName: string): string {
  return schema
    .replace(/CREATE DATABASE IF NOT EXISTS `clyvo`/g, `CREATE DATABASE IF NOT EXISTS \`${databaseName}\``)
    .replace(/USE `clyvo`;/g, `USE \`${databaseName}\`;`);
}

function printTroubleshooting(error: unknown): void {
  const code = (error as { code?: string })?.code;

  if (code === 'ECONNREFUSED') {
    logger.error('O MySQL nao respondeu. Ligue o WAMP Server (icone verde na bandeja).');
  }
  if (code === 'ER_ACCESS_DENIED_ERROR') {
    logger.error('Usuario ou senha invalidos. No WAMP o padrao e DB_USER=root e DB_PASSWORD vazio.');
  }
}

void main();
