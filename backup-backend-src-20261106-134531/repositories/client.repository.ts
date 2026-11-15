import { execute, query, queryOne } from '../config/database';
import type { CountRow } from '../types/models';
import type { ClientRow } from '../types/models2';
import type { Pagination } from '../utils/pagination';

export type ClientFilter = 'todos' | 'recentes' | 'recorrentes' | 'sem_contato' | 'alto_valor';

export interface ClientInput {
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  document?: string | null;
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  origin?: string | null;
}

const COLUMNS: Record<keyof ClientInput, string> = {
  name: 'name',
  phone: 'phone',
  whatsapp: 'whatsapp',
  email: 'email',
  document: 'document',
  zipCode: 'zip_code',
  street: 'street',
  number: 'number',
  complement: 'complement',
  district: 'district',
  city: 'city',
  state: 'state',
  notes: 'notes',
  origin: 'origin',
};

function filterClause(filter: ClientFilter, followUpDays: number): { sql: string; params: unknown[] } {
  switch (filter) {
    case 'recentes':
      return { sql: ' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)', params: [] };
    case 'recorrentes':
      return { sql: ' AND purchases_count >= 2', params: [] };
    case 'sem_contato':
      return {
        sql: ' AND (last_contact_at IS NULL OR last_contact_at < DATE_SUB(NOW(), INTERVAL ? DAY))',
        params: [Math.max(followUpDays, 7)],
      };
    case 'alto_valor':
      return { sql: ' AND total_purchased > 0', params: [] };
    default:
      return { sql: '', params: [] };
  }
}

export const clientRepository = {
  async list(
    userId: number,
    options: { search?: string; filter?: ClientFilter; followUpDays: number; pagination: Pagination },
  ): Promise<{ rows: ClientRow[]; total: number }> {
    const filter = filterClause(options.filter ?? 'todos', options.followUpDays);

    let where = 'user_id = ? AND deleted_at IS NULL';
    const params: unknown[] = [userId];

    if (options.search && options.search.trim().length > 0) {
      const term = `%${options.search.trim()}%`;
      const digits = options.search.replace(/\D/g, '');
      const phoneTerm = digits.length > 0 ? `%${digits}%` : term;
      where += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR whatsapp LIKE ?)';
      params.push(term, term, phoneTerm, phoneTerm);
    }

    where += filter.sql;
    params.push(...filter.params);

    const orderBy =
      options.filter === 'alto_valor'
        ? 'total_purchased DESC, name ASC'
        : options.filter === 'recentes'
          ? 'created_at DESC'
          : options.filter === 'sem_contato'
            ? 'last_contact_at IS NULL DESC, last_contact_at ASC'
            : 'name ASC';

    const rows = await query<ClientRow>(
      `SELECT * FROM clients WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, options.pagination.perPage, options.pagination.offset],
    );

    const totalRow = await queryOne<CountRow>(`SELECT COUNT(*) AS total FROM clients WHERE ${where}`, params);

    return { rows, total: totalRow?.total ?? 0 };
  },

  async findById(userId: number, id: number): Promise<ClientRow | null> {
    return queryOne<ClientRow>(
      'SELECT * FROM clients WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, userId],
    );
  },

  async create(userId: number, input: ClientInput): Promise<number> {
    const fields = ['user_id'];
    const placeholders = ['?'];
    const params: unknown[] = [userId];

    (Object.keys(COLUMNS) as Array<keyof ClientInput>).forEach((key) => {
      if (input[key] === undefined) return;
      fields.push(`\`${COLUMNS[key]}\``);
      placeholders.push('?');
      params.push(input[key]);
    });

    const result = await execute(
      `INSERT INTO clients (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
      params,
    );
    return result.insertId;
  },

  async update(userId: number, id: number, input: Partial<ClientInput>): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];

    (Object.keys(COLUMNS) as Array<keyof ClientInput>).forEach((key) => {
      if (input[key] === undefined) return;
      sets.push(`\`${COLUMNS[key]}\` = ?`);
      params.push(input[key]);
    });

    if (sets.length === 0) return;
    params.push(id, userId);
    await execute(`UPDATE clients SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, params);
  },

  async softDelete(userId: number, id: number): Promise<number> {
    const result = await execute(
      'UPDATE clients SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId],
    );
    return result.affectedRows;
  },

  async touchContact(userId: number, id: number): Promise<void> {
    await execute('UPDATE clients SET last_contact_at = NOW() WHERE id = ? AND user_id = ?', [id, userId]);
  },

  /** Atualiza as metricas denormalizadas apos registrar uma venda. */
  async addPurchase(userId: number, id: number, amount: number): Promise<void> {
    await execute(
      `UPDATE clients
          SET total_purchased = total_purchased + ?,
              purchases_count = purchases_count + 1,
              last_contact_at = NOW()
        WHERE id = ? AND user_id = ?`,
      [amount, id, userId],
    );
  },

  async countActive(userId: number): Promise<number> {
    const row = await queryOne<CountRow>(
      'SELECT COUNT(*) AS total FROM clients WHERE user_id = ? AND deleted_at IS NULL',
      [userId],
    );
    return row?.total ?? 0;
  },
};
