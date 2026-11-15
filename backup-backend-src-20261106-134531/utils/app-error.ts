/**
 * Erro de aplicacao com status HTTP e codigo estavel.
 *
 * Tudo que for lancado com AppError e considerado "esperado": o
 * middleware de erro devolve a mensagem para o cliente. Qualquer outro
 * erro vira 500 com mensagem generica (nunca vazamos stack em producao).
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message = 'Requisicao invalida.', details?: unknown): AppError {
    return new AppError(message, 400, 'BAD_REQUEST', details);
  }

  static validation(message = 'Dados invalidos.', details?: unknown): AppError {
    return new AppError(message, 422, 'VALIDATION_ERROR', details);
  }

  static unauthorized(message = 'Nao autenticado.', code = 'UNAUTHORIZED'): AppError {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Acesso negado.', code = 'FORBIDDEN'): AppError {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Registro nao encontrado.', code = 'NOT_FOUND'): AppError {
    return new AppError(message, 404, code);
  }

  static conflict(message = 'Registro ja existente.', code = 'CONFLICT'): AppError {
    return new AppError(message, 409, code);
  }

  static tooManyRequests(message = 'Muitas tentativas. Tente novamente em instantes.'): AppError {
    return new AppError(message, 429, 'TOO_MANY_REQUESTS');
  }

  static notImplemented(message = 'Funcionalidade ainda nao disponivel.'): AppError {
    return new AppError(message, 501, 'NOT_IMPLEMENTED');
  }

  static internal(message = 'Erro interno do servidor.'): AppError {
    return new AppError(message, 500, 'INTERNAL_ERROR');
  }
}
