import type { Request, Response } from 'express';

export function notFoundHandler(req: Request, res: Response): Response {
  return res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Rota nao encontrada: ${req.method} ${req.originalUrl}`,
    },
  });
}
