import { execute, queryOne, tx, type PoolConnection } from '../config/database';
import type { CompanyRow } from '../types/models';

export interface UpsertCompanyInput {
  legalName?: string | null;
  tradeName?: string | null;
  document?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  instagram?: string | null;
  website?: string | null;
}

const COLUMN_MAP: Record<keyof UpsertCompanyInput, string> = {
  legalName: 'legal_name',
  tradeName: 'trade_name',
  document: 'document',
  phone: 'phone',
  whatsapp: 'whatsapp',
  email: 'email',
  logoUrl: 'logo_url',
  zipCode: 'zip_code',
  street: 'street',
  number: 'number',
  complement: 'complement',
  district: 'district',
  city: 'city',
  state: 'state',
  instagram: 'instagram',
  website: 'website',
};

export const companyRepository = {
  async findByUserId(userId: number): Promise<CompanyRow | null> {
    return queryOne<CompanyRow>('SELECT * FROM companies WHERE user_id = ? LIMIT 1', [userId]);
  },

  /** Cria o registro de empresa junto com o cadastro do usuario. */
  async createInTransaction(
    connection: PoolConnection,
    userId: number,
    tradeName: string | null,
  ): Promise<number> {
    const result = await tx.execute(
      connection,
      'INSERT INTO companies (user_id, trade_name) VALUES (?, ?)',
      [userId, tradeName],
    );
    return result.insertId;
  },

  async update(userId: number, input: UpsertCompanyInput): Promise<void> {
    const fields: string[] = [];
    const params: unknown[] = [];

    (Object.keys(COLUMN_MAP) as Array<keyof UpsertCompanyInput>).forEach((key) => {
      if (input[key] !== undefined) {
        fields.push(`\`${COLUMN_MAP[key]}\` = ?`);
        params.push(input[key]);
      }
    });

    if (fields.length === 0) return;

    params.push(userId);
    await execute(`UPDATE companies SET ${fields.join(', ')} WHERE user_id = ?`, params);
  },
};
