import { execute, query, queryOne } from '../config/database';
import type { CountRow } from '../types/models';
import type { SaleRow } from '../types/models2';
import type { Pagination } from '../utils/pagination';

export interface SaleInput {
  clientId: number;
  opportunityId?: number | null;
  quoteId?: number | null;
  description?: string | null;
  amount: number;
  paymentMethod?: string | null;
  soldAt?: string | null;
  notes?: string | null;
}

export const saleRepository = {
  async list(
    userId: number,
    options: { clientId?: number; from?: string; to?: string; pagination: Pagination },
  ): Promise<{ rows: SaleRow[]; total: number }> {
    let where = 's.user_id = ? AND s.deleted_at IS NULL';
    const params: unknown[] = [userId];

    if (options.clientId) {
      where += ' AND s.client_id = ?';
      params.push(options.clientId);
    }
    if (options.from) {
      where += ' AND s.sold_at >= ?';
      params.push(options.from);
    }
    if (options.to) {
      where += ' AND s.sold_at < ?';
      params.push(options.to);
    }

    const rows = await query<SaleRow>(
      `SELECT s.*, c.name AS client_name
         FROM sales s INNER JOIN clients c ON c.id = s.client_id AND c.user_id = s.user_id
        WHERE ${where} ORDER BY s.sold_at DESC LIMIT ? OFFSET ?`,
      [...params, options.pagination.perPage, options.pagination.offset],
    );

    const totalRow = await queryOne<CountRow>(
      `SELECT COUNT(*) AS total FROM sales s
         INNER JOIN clients c ON c.id = s.client_id AND c.user_id = s.user_id
        WHERE ${where}`,
      params,
    );

    return { rows, total: totalRow?.total ?? 0 };
  },

  async findById(userId: number, id: number): Promise<SaleRow | null> {
    return queryOne<SaleRow>(
      `SELECT s.*, c.name AS client_name
         FROM sales s INNER JOIN clients c ON c.id = s.client_id AND c.user_id = s.user_id
        WHERE s.id = ? AND s.user_id = ? AND s.deleted_at IS NULL LIMIT 1`,
      [id, userId],
    );
  },

  async create(userId: number, input: SaleInput): Promise<number> {
    const result = await execute(
      `INSERT INTO sales
         (user_id, client_id, opportunity_id, quote_id, description, amount, payment_method, sold_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), ?)`,
      [
        userId,
        input.clientId,
        input.opportunityId ?? null,
        input.quoteId ?? null,
        input.description ?? null,
        input.amount,
        input.paymentMethod ?? null,
        input.soldAt ?? null,
        input.notes ?? null,
      ],
    );
    return result.insertId;
  },

  async softDelete(userId: number, id: number): Promise<number> {
    const result = await execute(
      'UPDATE sales SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId],
    );
    return result.affectedRows;
  },
};
