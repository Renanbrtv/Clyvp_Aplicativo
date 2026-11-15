import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Formato unico de resposta de sucesso da API. */
export interface ApiSuccessBody<T> {
  success: true;
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { status?: number; message?: string; meta?: Record<string, unknown> } = {},
): Response {
  const body: ApiSuccessBody<T> = { success: true, data };
  if (options.message) body.message = options.message;
  if (options.meta) body.meta = options.meta;
  return res.status(options.status ?? 200).json(body);
}

export function sendCreated<T>(res: Response, data: T, message?: string): Response {
  return sendSuccess(res, data, { status: 201, message });
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

/**
 * Encapsula handlers assincronos para que rejeicoes caiam no
 * middleware global de erros (Express 4 nao faz isso sozinho).
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

/** Extrai o IP real considerando proxy reverso. */
export function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? 'desconhecido';
}

/** User-Agent truncado para caber na coluna do banco. */
export function clientUserAgent(req: Request): string {
  return String(req.headers['user-agent'] ?? '').slice(0, 255);
}
