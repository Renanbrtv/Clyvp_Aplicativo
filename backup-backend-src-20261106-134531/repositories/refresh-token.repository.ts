import { execute, queryOne, type ResultSetHeader } from '../config/database';
import type { RefreshTokenRow } from '../types/models';
import { toMysqlDateTime } from '../utils/dates';

export const refreshTokenRepository = {
  async create(input: {
    userId: number;
    tokenId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<number> {
    const result: ResultSetHeader = await execute(
      `INSERT INTO refresh_tokens (user_id, token_id, token_hash, expires_at, user_agent, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.userId,
        input.tokenId,
        input.tokenHash,
        toMysqlDateTime(input.expiresAt),
        input.userAgent ?? null,
        input.ipAddress ?? null,
      ],
    );
    return result.insertId;
  },

  async findValidByTokenId(tokenId: string): Promise<RefreshTokenRow | null> {
    return queryOne<RefreshTokenRow>(
      `SELECT * FROM refresh_tokens
        WHERE token_id = ?
          AND revoked_at IS NULL
          AND expires_at > NOW()
        LIMIT 1`,
      [tokenId],
    );
  },

  async revokeByTokenId(tokenId: string): Promise<number> {
    const result = await execute(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_id = ? AND revoked_at IS NULL',
      [tokenId],
    );
    return result.affectedRows;
  },

  /** Usado no "sair de todos os dispositivos" e na troca de senha. */
  async revokeAllForUser(userId: number): Promise<number> {
    const result = await execute(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
      [userId],
    );
    return result.affectedRows;
  },

  /** Limpeza de tokens vencidos - pode virar uma rotina agendada. */
  async deleteExpired(): Promise<number> {
    const result = await execute(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL',
    );
    return result.affectedRows;
  },
};
