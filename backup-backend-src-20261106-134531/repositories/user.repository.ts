import { execute, query, queryOne, tx, type PoolConnection } from '../config/database';
import type { MainGoal, SellsType } from '../config/constants';
import type { CountRow, UserRow } from '../types/models';

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string | null;
  whatsapp?: string | null;
}

export interface UpdateUserProfileInput {
  name?: string;
  phone?: string | null;
  whatsapp?: string | null;
  avatarUrl?: string | null;
}

export interface OnboardingInput {
  sellsType: SellsType;
  mainGoal: MainGoal;
}

/**
 * Acesso a tabela `users`.
 * Todas as buscas ignoram contas com deleted_at preenchido.
 */
export const userRepository = {
  async findById(id: number): Promise<UserRow | null> {
    return queryOne<UserRow>(
      'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id],
    );
  },

  async findByEmail(email: string): Promise<UserRow | null> {
    return queryOne<UserRow>(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1',
      [email.toLowerCase()],
    );
  },

  async emailExists(email: string): Promise<boolean> {
    const row = await queryOne<CountRow>(
      'SELECT COUNT(*) AS total FROM users WHERE email = ? AND deleted_at IS NULL',
      [email.toLowerCase()],
    );
    return (row?.total ?? 0) > 0;
  },

  /** Cria o usuario dentro da transacao de cadastro. */
  async createInTransaction(connection: PoolConnection, input: CreateUserInput): Promise<number> {
    const result = await tx.execute(
      connection,
      `INSERT INTO users (name, email, password_hash, phone, whatsapp)
       VALUES (?, ?, ?, ?, ?)`,
      [
        input.name,
        input.email.toLowerCase(),
        input.passwordHash,
        input.phone ?? null,
        input.whatsapp ?? null,
      ],
    );
    return result.insertId;
  },

  async updateProfile(userId: number, input: UpdateUserProfileInput): Promise<void> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (input.name !== undefined) {
      fields.push('name = ?');
      params.push(input.name);
    }
    if (input.phone !== undefined) {
      fields.push('phone = ?');
      params.push(input.phone);
    }
    if (input.whatsapp !== undefined) {
      fields.push('whatsapp = ?');
      params.push(input.whatsapp);
    }
    if (input.avatarUrl !== undefined) {
      fields.push('avatar_url = ?');
      params.push(input.avatarUrl);
    }

    if (fields.length === 0) return;

    params.push(userId);
    await execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`, params);
  },

  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    await execute('UPDATE users SET password_hash = ? WHERE id = ? AND deleted_at IS NULL', [
      passwordHash,
      userId,
    ]);
  },

  async completeOnboarding(userId: number, input: OnboardingInput): Promise<void> {
    await execute(
      `UPDATE users
          SET sells_type = ?, main_goal = ?, onboarding_completed = 1
        WHERE id = ? AND deleted_at IS NULL`,
      [input.sellsType, input.mainGoal, userId],
    );
  },

  async touchLastLogin(userId: number): Promise<void> {
    await execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [userId]);
  },

  /** Exclusao logica: preserva historico e libera o e-mail apenas na exclusao fisica. */
  async softDelete(userId: number): Promise<void> {
    await execute('UPDATE users SET deleted_at = NOW(), status = ? WHERE id = ?', ['inativo', userId]);
  },

  async lock(userId: number): Promise<void> {
    await queryOne<UserRow>('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL FOR UPDATE', [userId]);
  },

  async deletePermanently(userId: number): Promise<void> {
    // ON DELETE CASCADE remove os dados e tokens associados numa unica operacao.
    await execute('DELETE FROM users WHERE id = ?', [userId]);
  },

  async listAll(limit = 50): Promise<UserRow[]> {
    return query<UserRow>(
      'SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?',
      [limit],
    );
  },
};
