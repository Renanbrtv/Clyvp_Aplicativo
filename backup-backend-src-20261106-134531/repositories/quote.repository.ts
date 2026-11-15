import { execute, query, queryOne, tx, type PoolConnection } from '../config/database';
import type { QuoteStatus, QuoteType } from '../config/constants';
import type { CountRow } from '../types/models';
import type { QuoteItemRow, QuoteRow } from '../types/models2';
import type { Pagination } from '../utils/pagination';

export interface QuoteItemInput {
  itemType: 'produto' | 'servico' | 'avulso';
  productId?: number | null;
  serviceId?: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface QuoteInput {
  clientId: number;
  opportunityId?: number | null;
  type: QuoteType;
  discountType?: 'valor' | 'percentual';
  discountAmount?: number;
  deliveryTime?: string | null;
  warranty?: string | null;
  paymentMethods?: string | null;
  validUntil?: string | null;
  notes?: string | null;
  items: QuoteItemInput[];
}

const SELECT_BASE = `
  SELECT q.*, c.name AS client_name, c.whatsapp AS client_whatsapp, c.phone AS client_phone
    FROM quotes q
    INNER JOIN clients c ON c.id = q.client_id AND c.user_id = q.user_id`;

export const quoteRepository = {
  async list(
    userId: number,
    options: {
      status?: QuoteStatus;
      type?: QuoteType;
      clientId?: number;
      opportunityId?: number;
      pending?: boolean;
      pagination: Pagination;
    },
  ): Promise<{ rows: QuoteRow[]; total: number }> {
    let where = 'q.user_id = ? AND q.deleted_at IS NULL';
    const params: unknown[] = [userId];

    if (options.status) {
      where += ' AND q.status = ?';
      params.push(options.status);
    }
    if (options.pending) where += " AND q.status IN ('enviado','visualizado')";
    if (options.type) {
      where += ' AND q.type = ?';
      params.push(options.type);
    }
    if (options.clientId) {
      where += ' AND q.client_id = ?';
      params.push(options.clientId);
    }
    if (options.opportunityId) {
      where += ' AND q.opportunity_id = ?';
      params.push(options.opportunityId);
    }

    const rows = await query<QuoteRow>(
      `${SELECT_BASE} WHERE ${where} ORDER BY q.created_at DESC LIMIT ? OFFSET ?`,
      [...params, options.pagination.perPage, options.pagination.offset],
    );

    const totalRow = await queryOne<CountRow>(
      `SELECT COUNT(*) AS total FROM quotes q
         INNER JOIN clients c ON c.id = q.client_id AND c.user_id = q.user_id
        WHERE ${where}`,
      params,
    );

    return { rows, total: totalRow?.total ?? 0 };
  },

  async findById(userId: number, id: number): Promise<QuoteRow | null> {
    return queryOne<QuoteRow>(
      `${SELECT_BASE} WHERE q.id = ? AND q.user_id = ? AND q.deleted_at IS NULL LIMIT 1`,
      [id, userId],
    );
  },

  async items(userId: number, quoteId: number): Promise<QuoteItemRow[]> {
    return query<QuoteItemRow>(
      'SELECT * FROM quote_items WHERE quote_id = ? AND user_id = ? ORDER BY sort_order ASC, id ASC',
      [quoteId, userId],
    );
  },

  /** Proximo numero sequencial do usuario (#0104). */
  async nextNumber(connection: PoolConnection, userId: number): Promise<number> {
    const row = await tx.queryOne<CountRow>(
      connection,
      'SELECT COALESCE(MAX(number), 100) AS total FROM quotes WHERE user_id = ? FOR UPDATE',
      [userId],
    );
    return (row?.total ?? 100) + 1;
  },

  async createInTransaction(
    connection: PoolConnection,
    userId: number,
    input: QuoteInput & { number: number; subtotal: number; total: number },
  ): Promise<number> {
    const result = await tx.execute(
      connection,
      `INSERT INTO quotes
         (user_id, client_id, opportunity_id, type, number, status, subtotal, discount_type,
          discount_amount, total, delivery_time, warranty, payment_methods, valid_until, notes)
       VALUES (?, ?, ?, ?, ?, 'rascunho', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        input.clientId,
        input.opportunityId ?? null,
        input.type,
        input.number,
        input.subtotal,
        input.discountType ?? 'valor',
        input.discountAmount ?? 0,
        input.total,
        input.deliveryTime ?? null,
        input.warranty ?? null,
        input.paymentMethods ?? null,
        input.validUntil ?? null,
        input.notes ?? null,
      ],
    );
    return result.insertId;
  },

  async insertItemInTransaction(
    connection: PoolConnection,
    userId: number,
    quoteId: number,
    item: QuoteItemInput & { total: number },
    sortOrder: number,
  ): Promise<void> {
    await tx.execute(
      connection,
      `INSERT INTO quote_items
         (user_id, quote_id, item_type, product_id, service_id, description, quantity, unit_price, discount, total, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        quoteId,
        item.itemType,
        item.productId ?? null,
        item.serviceId ?? null,
        item.description,
        item.quantity,
        item.unitPrice,
        item.discount ?? 0,
        item.total,
        sortOrder,
      ],
    );
  },

  async deleteItems(userId: number, quoteId: number): Promise<void> {
    await execute('DELETE FROM quote_items WHERE quote_id = ? AND user_id = ?', [quoteId, userId]);
  },

  async updateTotals(
    userId: number,
    quoteId: number,
    values: { subtotal: number; discountAmount: number; total: number; discountType: 'valor' | 'percentual' },
  ): Promise<void> {
    await execute(
      `UPDATE quotes SET subtotal = ?, discount_type = ?, discount_amount = ?, total = ?
        WHERE id = ? AND user_id = ?`,
      [values.subtotal, values.discountType, values.discountAmount, values.total, quoteId, userId],
    );
  },

  async updateDetails(
    userId: number,
    quoteId: number,
    input: Partial<Pick<QuoteInput, 'type' | 'deliveryTime' | 'warranty' | 'paymentMethods' | 'validUntil' | 'notes'>>,
  ): Promise<void> {
    const map: Record<string, string> = {
      type: 'type',
      deliveryTime: 'delivery_time',
      warranty: 'warranty',
      paymentMethods: 'payment_methods',
      validUntil: 'valid_until',
      notes: 'notes',
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
    params.push(quoteId, userId);
    await execute(`UPDATE quotes SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, params);
  },

  async updateStatus(userId: number, quoteId: number, status: QuoteStatus): Promise<void> {
    await execute(
      `UPDATE quotes
          SET status = ?,
              sent_at     = IF(? = 'enviado',    NOW(), sent_at),
              viewed_at   = IF(? = 'visualizado', NOW(), viewed_at),
              accepted_at = IF(? = 'aceito',     NOW(), accepted_at),
              rejected_at = IF(? = 'recusado',   NOW(), rejected_at)
        WHERE id = ? AND user_id = ?`,
      [status, status, status, status, status, quoteId, userId],
    );
  },

  async addHistory(
    userId: number,
    quoteId: number,
    from: QuoteStatus | null,
    to: QuoteStatus,
    note?: string | null,
  ): Promise<void> {
    await execute(
      `INSERT INTO quote_status_history (user_id, quote_id, from_status, to_status, note)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, quoteId, from, to, note ?? null],
    );
  },

  async softDelete(userId: number, id: number): Promise<number> {
    const result = await execute(
      'UPDATE quotes SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId],
    );
    return result.affectedRows;
  },

  async countCreatedThisMonth(userId: number): Promise<number> {
    const row = await queryOne<CountRow>(
      `SELECT COUNT(*) AS total FROM quotes
        WHERE user_id = ? AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
      [userId],
    );
    return row?.total ?? 0;
  },

  /** Marca como expirados os orcamentos cuja validade passou. */
  async expireOverdue(userId: number): Promise<number> {
    const result = await execute(
      `UPDATE quotes SET status = 'expirado'
        WHERE user_id = ? AND deleted_at IS NULL
          AND status IN ('enviado','visualizado')
          AND valid_until IS NOT NULL AND valid_until < CURDATE()`,
      [userId],
    );
    return result.affectedRows;
  },
};
