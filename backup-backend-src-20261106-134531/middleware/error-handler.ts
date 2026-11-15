import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { env } from '../config/env';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';
import { formatZodError } from './validate';

interface MysqlError extends Error {
  code?: string;
  errno?: number;
  sqlMessage?: string;
}

/**
 * Tratamento global de erros.
 * Erros esperados (AppError) viram resposta amigavel;
 * qualquer outro vira 500 generico - detalhes so no log do servidor.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  const normalized = normalize(error);

  if (normalized.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${normalized.statusCode}`, error);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${normalized.statusCode} ${normalized.code}`);
  }

  const body: Record<string, unknown> = {
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
    },
  };

  if (normalized.details !== undefined) {
    (body.error as Record<string, unknown>).details = normalized.details;
  }

  if (env.isDevelopment && normalized.statusCode >= 500 && error instanceof Error) {
    (body.error as Record<string, unknown>).stack = error.stack;
  }

  return res.status(normalized.statusCode).json(body);
}

function normalize(error: unknown): {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
} {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: 'Verifique os campos informados.',
      details: formatZodError(error),
    };
  }

  if (isMysqlError(error)) {
    return translateMysqlError(error);
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return {
      statusCode: 400,
      code: 'INVALID_JSON',
      message: 'O corpo da requisicao nao e um JSON valido.',
    };
  }

  return {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'Erro interno do servidor. Tente novamente em instantes.',
  };
}

const CONNECTION_ERROR_CODES = ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'ENOTFOUND'];

function isMysqlError(error: unknown): error is MysqlError {
  if (!(error instanceof Error)) return false;

  const code = (error as MysqlError).code;
  if (typeof code !== 'string') return false;

  return code.startsWith('ER_') || CONNECTION_ERROR_CODES.includes(code);
}

function translateMysqlError(error: MysqlError): {
  statusCode: number;
  code: string;
  message: string;
} {
  switch (error.code) {
    case 'ER_DUP_ENTRY':
      return {
        statusCode: 409,
        code: 'DUPLICATE_ENTRY',
        message: 'Ja existe um registro com esses dados.',
      };
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return {
        statusCode: 422,
        code: 'INVALID_REFERENCE',
        message: 'Um dos registros relacionados nao existe.',
      };
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return {
        statusCode: 409,
        code: 'RECORD_IN_USE',
        message: 'Este registro esta sendo usado por outro cadastro.',
      };
    case 'ER_NO_SUCH_TABLE':
      return {
        statusCode: 500,
        code: 'DATABASE_NOT_MIGRATED',
        message: 'Banco de dados nao inicializado. Execute: npm run db:migrate',
      };
    case 'ER_BAD_DB_ERROR':
      return {
        statusCode: 500,
        code: 'DATABASE_NOT_FOUND',
        message: 'Banco de dados nao encontrado. Execute: npm run db:migrate',
      };
    case 'ER_ACCESS_DENIED_ERROR':
      return {
        statusCode: 500,
        code: 'DATABASE_ACCESS_DENIED',
        message: 'Usuario ou senha do MySQL invalidos. Revise o arquivo .env',
      };
    case 'ECONNREFUSED':
      return {
        statusCode: 503,
        code: 'DATABASE_UNAVAILABLE',
        message: 'Nao foi possivel conectar ao MySQL. Verifique se o WAMP esta ligado.',
      };
    default:
      return {
        statusCode: 500,
        code: 'DATABASE_ERROR',
        message: 'Erro ao acessar o banco de dados.',
      };
  }
}
