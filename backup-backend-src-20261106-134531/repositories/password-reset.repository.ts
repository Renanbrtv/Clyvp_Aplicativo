import { execute, queryOne } from '../config/database';
import type { PasswordResetTokenRow } from '../types/models';
import { toMysqlDateTime } from '../utils/dates';

export const passwordResetRepository = {
  async create(userId: number, tokenHash: string, expiresAt: Date): Promise<number> {
    const result = await execute(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, toMysqlDateTime(expiresAt)],
    );
    return result.insertId;
  },

  async findValidByHash(tokenHash: string, lock = false): Promise<PasswordResetTokenRow | null> {
    return queryOne<PasswordResetTokenRow>(
      `SELECT * FROM password_reset_tokens
        WHERE token_hash = ?
          AND used_at IS NULL
          AND expires_at > NOW()
        LIMIT 1 ${lock ? 'FOR UPDATE' : ''}`,
      [tokenHash],
    );
  },

  async markAsUsed(id: number): Promise<void> {
    await execute('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [id]);
  },

  /** Invalida pedidos anteriores ao gerar um novo. */
  async invalidateAllForUser(userId: number): Promise<void> {
    await execute(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
      [userId],
    );
  },
};
