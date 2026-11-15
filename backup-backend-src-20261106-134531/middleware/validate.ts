import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';

import { AppError } from '../utils/app-error';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Valida (e normaliza) uma parte da requisicao com um schema Zod.
 * O valor validado SUBSTITUI o original - nada que nao esteja no schema
 * chega aos controllers.
 */
export function validate(schema: ZodSchema, part: RequestPart = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      return next(AppError.validation('Verifique os campos informados.', formatZodError(result.error)));
    }

    if (part === 'body') {
      req.body = result.data;
    } else {
      // req.query e req.params sao getters em algumas versoes do Express:
      // sobrescrevemos as chaves em vez de trocar o objeto.
      Object.assign(req[part], result.data);
    }

    return next();
  };
}

export function formatZodError(error: ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(raiz)',
    message: issue.message,
  }));
}
