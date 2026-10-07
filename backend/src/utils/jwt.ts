import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

import { env } from '../config/env';
import { AppError } from './app-error';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  version: number;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

type Expiration = SignOptions['expiresIn'];

export function signAccessToken(userId: number, email: string, version = 0): string {
  return jwt.sign({ email, version, type: 'access' }, env.JWT_ACCESS_SECRET, {
    subject: String(userId),
    issuer: env.JWT_ISSUER,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as Expiration,
  });
}

export function signRefreshToken(userId: number, tokenId: string): string {
  return jwt.sign({ jti: tokenId, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    subject: String(userId),
    issuer: env.JWT_ISSUER,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as Expiration,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
    }) as JwtPayload;

    if (payload.type !== 'access' || !payload.sub) {
      throw AppError.unauthorized('Token invalido.', 'INVALID_TOKEN');
    }

    return {
      sub: String(payload.sub),
      email: String(payload.email ?? ''),
      version: Number(payload.version ?? 0),
      type: 'access',
    };
  } catch (error) {
    throw translateJwtError(error, 'Token de acesso invalido ou expirado.');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: env.JWT_ISSUER,
    }) as JwtPayload;

    if (payload.type !== 'refresh' || !payload.sub || !payload.jti) {
      throw AppError.unauthorized('Token invalido.', 'INVALID_TOKEN');
    }

    return {
      sub: String(payload.sub),
      jti: String(payload.jti),
      type: 'refresh',
    };
  } catch (error) {
    throw translateJwtError(error, 'Sessao expirada. Faca login novamente.');
  }
}

function translateJwtError(error: unknown, fallbackMessage: string): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof jwt.TokenExpiredError) {
    return AppError.unauthorized('Token expirado.', 'TOKEN_EXPIRED');
  }

  if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError) {
    return AppError.unauthorized(fallbackMessage, 'INVALID_TOKEN');
  }

  return AppError.unauthorized(fallbackMessage, 'INVALID_TOKEN');
}

/** Converte "15m", "30d", "3600" em segundos - usado para expor expires_in. */
export function expiresInSeconds(expression: string): number {
  const match = /^(\d+)\s*([smhd])?$/i.exec(expression.trim());
  if (!match) return 0;

  const amount = Number(match[1]);
  const unit = (match[2] ?? 's').toLowerCase();

  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * (multipliers[unit] ?? 1);
}
