import { queryOne, type RowDataPacket } from '../config/database';
import type { NextFunction, Request, Response } from 'express';

import { billingService } from '../services/billing.service';
import { AppError } from '../utils/app-error';
import { verifyAccessToken } from '../utils/jwt';
import { userRepository } from '../repositories/user.repository';

/**
 * Protege rotas privadas.
 *
 * 1. Le o header Authorization: Bearer <token>
 * 2. Valida a assinatura e a expiracao do JWT
 * 3. Recarrega o usuario no banco (conta excluida/bloqueada perde acesso na hora)
 * 4. Anexa o usuario em req.user
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      throw AppError.unauthorized('Token de acesso nao informado.', 'MISSING_TOKEN');
    }

    const payload = verifyAccessToken(token);
    const user = await userRepository.findById(Number(payload.sub));

    if (!user) {
      throw AppError.unauthorized('Conta nao encontrada.', 'USER_NOT_FOUND');
    }

    if (user.status !== 'ativo') {
      throw AppError.forbidden('Esta conta esta inativa ou bloqueada.', 'USER_NOT_ACTIVE');
    }

    const security = await queryOne<RowDataPacket>('SELECT version FROM session_security WHERE user_id=?', [user.id]);
    if (payload.version !== Number(security?.version ?? 0)) throw AppError.unauthorized('Sua senha foi alterada. Entre novamente.', 'SESSION_REVOKED');
    if (billingService.configured) {
      try { await billingService.sync(user.id); } catch { /* Keep read access; paid actions verify separately. */ }
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/** Le req.user garantindo o tipo - use dentro de rotas ja autenticadas. */
export function requireUser(req: Request): { id: number; email: string; name: string } {
  if (!req.user) {
    throw AppError.unauthorized('Nao autenticado.');
  }
  return req.user;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;

  return token.trim();
}
