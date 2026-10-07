import { AsyncLocalStorage } from 'node:async_hooks';
import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';

import { env } from './env';
import { logger } from '../utils/logger';

/**
 * Pool unico de conexoes MySQL compartilhado por toda a aplicacao.
 * Criado sob demanda (lazy) para que scripts possam conectar sem subir o servidor HTTP.
 */
let pool: Pool | null = null;
const transactionContext = new AsyncLocalStorage<PoolConnection>();

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      // Bancos gerenciados exigem TLS. "rejectUnauthorized: true" mantem a
      // verificacao do certificado - nao desligue isso para "resolver" erro.
      ...(env.DB_SSL ? { ssl: { rejectUnauthorized: true } } : {}),
      waitForConnections: true,
      connectionLimit: env.DB_CONNECTION_LIMIT,
      queueLimit: 0,
      timezone: env.DB_TIMEZONE,
      charset: 'utf8mb4_unicode_ci',
      dateStrings: false,
      supportBigNumbers: true,
      bigNumberStrings: false,
      decimalNumbers: true,
      namedPlaceholders: false,
    });

    pool.on('connection', connection => { connection.query("SET time_zone = '+00:00'"); });

    logger.debug(
      `Pool MySQL criado (${env.DB_USER}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}, limite ${env.DB_CONNECTION_LIMIT})`,
    );
  }

  return pool;
}

/** Cria um pool sem selecionar database - usado pelo script de migration. */
export function createServerPool(): Pool {
  const migrationPool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ...(env.DB_SSL ? { ssl: { rejectUnauthorized: true } } : {}),
    waitForConnections: true,
    connectionLimit: 2,
    multipleStatements: true,
    charset: 'utf8mb4_unicode_ci',
  });
  migrationPool.on('connection', connection => { connection.query("SET time_zone = '+00:00'"); });
  return migrationPool;
}

/** SELECT que retorna varias linhas. */
export async function query<T extends RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await (transactionContext.getStore() ?? getPool()).query<T[]>(sql, params);
  return rows;
}

/** SELECT que retorna no maximo uma linha (ou null). */
export async function queryOne<T extends RowDataPacket>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/** INSERT / UPDATE / DELETE. Retorna o header com insertId e affectedRows. */
export async function execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await (transactionContext.getStore() ?? getPool()).query<ResultSetHeader>(sql, params);
  return result;
}

/**
 * Executa um bloco dentro de uma transacao.
 * Faz commit no sucesso e rollback em qualquer erro.
 */
export async function withTransaction<T>(
  handler: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const current = transactionContext.getStore();
  if (current) return handler(current);
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    const result = await transactionContext.run(connection, () => handler(connection));
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      logger.error('Falha ao executar rollback da transacao', rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
}

/** Helpers com a mesma assinatura dos de cima, porem dentro de uma transacao. */
export const tx = {
  async query<T extends RowDataPacket>(
    connection: PoolConnection,
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const [rows] = await connection.query<T[]>(sql, params);
    return rows;
  },
  async queryOne<T extends RowDataPacket>(
    connection: PoolConnection,
    sql: string,
    params: unknown[] = [],
  ): Promise<T | null> {
    const rows = await tx.query<T>(connection, sql, params);
    return rows.length > 0 ? rows[0] : null;
  },
  async execute(
    connection: PoolConnection,
    sql: string,
    params: unknown[] = [],
  ): Promise<ResultSetHeader> {
    const [result] = await connection.query<ResultSetHeader>(sql, params);
    return result;
  },
};

/** Verifica se o banco esta acessivel (usado no /health e no boot). */
export async function assertDatabaseConnection(): Promise<void> {
  const connection = await getPool().getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.debug('Pool MySQL encerrado');
  }
}

export type { Pool, PoolConnection, ResultSetHeader, RowDataPacket };
