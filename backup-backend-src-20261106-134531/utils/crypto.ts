import crypto from 'node:crypto';

/** Token opaco aleatorio (usado em refresh tokens e recuperacao de senha). */
export function generateOpaqueToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Identificador unico curto para o claim jti do refresh token. */
export function generateTokenId(): string {
  return crypto.randomUUID();
}

/**
 * Tokens nunca sao gravados em texto puro no banco - apenas o hash SHA-256.
 * Se o banco vazar, os tokens nao podem ser reutilizados.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Comparacao em tempo constante (evita timing attack). */
export function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}
