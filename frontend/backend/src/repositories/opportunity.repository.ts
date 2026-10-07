import { execute, query, queryOne, tx, type PoolConnection } from '../config/database';
import type { OpportunityStatus } from '../config/constants';
import type { CountRow } from '../types/models';
import type { OpportunityHistoryRow, OpportunityRow } from '../types/models2';
import type { Pagination } from '../utils/pagination';

export interface OpportunityInput {
  clientId: number;
  title: string;
  description?: string | null;
  status?: OpportunityStatus;
  source?: string | null;
  totalAmount?: number;
  expectedCloseDate?: string | null;
}

const SELECT_BASE = `
  SELECT o.*,
         c.name     AS client_name,
         c.whatsapp AS client_whatsapp,
         c.phone    AS client_phone,
         DATEDIFF(NOW(), COALESCE(o.last_contact_at, o.created_at)) AS days_without_contact,
         (SELECT q.id FROM quotes q
           WHERE q.opportunity_id = o.id AND q.user_id = o.user_id AND q.deleted_at IS NULL
           ORDER BY q.created_at DESC LIMIT 1) AS quote_id,
         (SELECT q.number FROM quotes q
           WHERE q.opportunity_id = o.id AND q.user_id = o.user_id AND q.deleted_at IS NULL
           ORDER BY q.created_at DESC LIMIT 1) AS quote_number
    FROM opportunities o
    INNER JOIN clients c ON c.id = o.client_id AND c.user_id = o.user_id`;

export const opportunityRepository = {
  async list(
    userId: number,
    options: {
      status?: OpportunityStatus;
      clientId?: number;
      search?: string;
      open?: boolean;
      pagination: Pagination;
    },
  ): Promise<{ rows: OpportunityRow[]; total: number }> {
    let where = 'o.user_id = ? AND o.deleted_at IS NULL';
    const params: unknown[] = [userId];

    if (options.status) {
      where += ' AND o.status = ?';
      params.push(options.status);
    }
    if (options.open) {
      where += " AND o.status NOT IN ('fechado', 'perdido')";
    }
    if (options.clientId) {
      where += ' AND o.client_id = ?';
      params.push(options.clientId);
    }
    if (options.search && options.search.trim().length > 0) {
      where += ' AND (o.title LIKE ? OR c.name LIKE ?)';
      const term = `%${options.search.trim()}%`;
      params.push(term, term);
    }

    const rows = await query<OpportunityRow>(
      `${SELECT_BASE} WHERE ${where}
        ORDER BY FIELD(o.status,'aguardando_pagamento','negociacao','proposta_enviada','novo_contato','fechado','perdido'),
                 o.last_contact_at IS NULL DESC, o.last_contact_at ASC
        LIMIT ? OFFSET ?`,
      [...params, options.pagination.perPage, options.pagination.offset],
    );

    const totalRow = await queryOne<CountRow>(
      `SELECT COUNT(*) AS total FROM opportunities o
         INNER JOIN clients c ON c.id = o.client_id AND c.user_id = o.user_id
        WHERE ${where}`,
      params,
    );

    return { rows, total: totalRow?.total ?? 0 };
  },

  async findById(userId: number, id: number): Promise<OpportunityRow | null> {
    return queryOne<OpportunityRow>(`${SELECT_BASE} WHERE o.id = ? AND o.user_id = ? AND o.deleted_at IS NULL LIMIT 1`, [
      id,
      userId,
    ]);
  },

  async create(userId: number, input: OpportunityInput): Promise<number> {
    const result = await execute(
      `INSERT INTO opportunities
         (user_id, client_id, title, description, status, source, total_amount, expected_close_date, last_contact_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        input.clientId,
        input.title,
        input.description ?? null,
        input.status ?? 'novo_contato',
        input.source ?? null,
        input.totalAmount ?? 0,
        input.expectedCloseDate ?? null,
      ],
    );
    return result.insertId;
  },

  async createInTransaction(
    connection: PoolConnection,
    userId: number,
    input: OpportunityInput,
  ): Promise<number> {
    const result = await tx.execute(
      connection,
      `INSERT INTO opportunities
         (user_id, client_id, title, description, status, source, total_amount, last_contact_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        input.clientId,
        input.title,
        input.description ?? null,
        input.status ?? 'novo_contato',
        input.source ?? null,
        input.totalAmount ?? 0,
      ],
    );
    return result.insertId;
  },

  async update(
    userId: number,
    id: number,
    input: Partial<Omit<OpportunityInput, 'clientId'>> & { lostReason?: string | null },
  ): Promise<void> {
    const map: Record<string, string> = {
      title: 'title',
      description: 'description',
      source: 'source',
      totalAmount: 'total_amount',
      expectedCloseDate: 'expected_close_date',
      lostReason: 'lost_reason',
    };

    const sets: string[] = [];
    const params: unknown[] = [];

    Object.keys(map).forEach((key) => {
      const value = (input as Record<string, unknown>)[key];
      if (value === undefined) return;
      sets.push(`\`${map[key]}\` = ?`);
      params.push(value);
    });

    if (sets.length === 0) return;
    params.push(id, userId);
    await execute(`UPDATE opportunities SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, params);
  },

  async updateStatus(
    userId: number,
    id: number,
    status: OpportunityStatus,
    lostReason?: string | null,
  ): Promise<void> {
    await execute(
      `UPDATE opportunities
          SET status = ?,
              lost_reason = ?,
              closed_at = IF(? IN ('fechado','perdido'), NOW(), NULL),
              last_contact_at = NOW()
        WHERE id = ? AND user_id = ?`,
      [status, lostReason ?? null, status, id, userId],
    );
  },

  async setTotal(userId: number, id: number, total: number): Promise<void> {
    await execute('UPDATE opportunities SET total_amount = ? WHERE id = ? AND user_id = ?', [
      total,
      id,
      userId,
    ]);
  },

  async touchContact(userId: number, id: number): Promise<void> {
    await execute('UPDATE opportunities SET last_contact_at = NOW() WHERE id = ? AND user_id = ?', [
      id,
      userId,
    ]);
  },

  async softDelete(userId: number, id: number): Promise<number> {
    const result = await execute(
      'UPDATE opportunities SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId],
    );
    return result.affectedRows;
  },

  async addHistory(
    userId: number,
    opportunityId: number,
    from: OpportunityStatus | null,
    to: OpportunityStatus,
    note?: string | null,
  ): Promise<void> {
    await execute(
      `INSERT INTO opportunity_status_history (user_id, opportunity_id, from_status, to_status, note)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, opportunityId, from, to, note ?? null],
    );
  },

  async history(userId: number, opportunityId: number): Promise<OpportunityHistoryRow[]> {
    return query<OpportunityHistoryRow>(
      `SELECT id, from_status, to_status, note, created_at
         FROM opportunity_status_history
        WHERE user_id = ? AND opportunity_id = ?
        ORDER BY created_at DESC`,
      [userId, opportunityId],
    );
  },

  /** Quantidade criada no mes - usado no limite do plano Free. */
  async countCreatedThisMonth(userId: number): Promise<number> {
    const row = await queryOne<CountRow>(
      `SELECT COUNT(*) AS total FROM opportunities
        WHERE user_id = ? AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
      [userId],
    );
    return row?.total ?? 0;
  },
};
