import bcrypt from 'bcryptjs';

import { env } from '../config/env';

/**
 * Hash e verificacao de senha.
 * A senha em texto puro NUNCA e persistida nem registrada em log.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, env.BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  if (!passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Comparacao "dummy" usada no login quando o e-mail nao existe.
 * Mantem o tempo de resposta parecido com o de um e-mail valido,
 * dificultando a descoberta de contas cadastradas por timing.
 *
 * O hash de referencia e gerado uma unica vez, sob demanda.
 */
let dummyHashPromise: Promise<string> | null = null;

export async function fakePasswordCheck(): Promise<void> {
  if (!dummyHashPromise) {
    dummyHashPromise = bcrypt.hash('clyvo-dummy-password-comparison', env.BCRYPT_SALT_ROUNDS);
  }

  const dummyHash = await dummyHashPromise;
  await bcrypt.compare('senha-invalida-para-comparacao', dummyHash);
}
