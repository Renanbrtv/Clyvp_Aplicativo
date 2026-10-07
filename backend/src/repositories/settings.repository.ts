import { execute, queryOne, tx, type PoolConnection } from '../config/database';
import type { SettingsRow } from '../types/models';

export interface UpdateSettingsInput {
  currency?: string;
  locale?: string;
  timezone?: string;
  followUpDays?: number;
  quoteValidityDays?: number;
  defaultWarrantyDays?: number | null;
  notificationsEnabled?: boolean;
  whatsappSignature?: string | null;
  theme?: 'claro' | 'escuro' | 'sistema';
}

const COLUMN_MAP: Record<keyof UpdateSettingsInput, string> = {
  currency: 'currency',
  locale: 'locale',
  timezone: 'timezone',
  followUpDays: 'follow_up_days',
  quoteValidityDays: 'quote_validity_days',
  defaultWarrantyDays: 'default_warranty_days',
  notificationsEnabled: 'notifications_enabled',
  whatsappSignature: 'whatsapp_signature',
  theme: 'theme',
};

export const settingsRepository = {
  async findByUserId(userId: number): Promise<SettingsRow | null> {
    return queryOne<SettingsRow>('SELECT * FROM settings WHERE user_id = ? LIMIT 1', [userId]);
  },

  async createInTransaction(connection: PoolConnection, userId: number): Promise<number> {
    const result = await tx.execute(connection, 'INSERT INTO settings (user_id) VALUES (?)', [userId]);
    return result.insertId;
  },

  async update(userId: number, input: UpdateSettingsInput): Promise<void> {
    const fields: string[] = [];
    const params: unknown[] = [];

    (Object.keys(COLUMN_MAP) as Array<keyof UpdateSettingsInput>).forEach((key) => {
      const value = input[key];
      if (value === undefined) return;
      fields.push(`\`${COLUMN_MAP[key]}\` = ?`);
      params.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
    });

    if (fields.length === 0) return;

    params.push(userId);
    await execute(`UPDATE settings SET ${fields.join(', ')} WHERE user_id = ?`, params);
  },
};
