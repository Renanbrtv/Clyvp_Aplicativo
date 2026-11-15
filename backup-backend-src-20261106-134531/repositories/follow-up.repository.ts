import { execute, query, queryOne } from '../config/database';
import type { FollowUpStatus } from '../config/constants';
import type { CountRow } from '../types/models';
import type { FollowUpRow } from '../types/models2';

export type FollowUpType = 'contato' | 'retorno' | 'recuperacao' | 'pos_venda' | 'garantia' | 'outro';
export type FollowUpPeriod = 'hoje' | 'amanha' | 'semana' | 'atrasados' | 'todos';

export interface FollowUpInput {
  clientId?: number | null;
  opportunityId?: number | null;
  quoteId?: number | null;
  type: FollowUpType;
  title: string;
  notes?: string | null;
  dueDate: string;
}

const SELECT_BASE = `
  SELECT f.*,
         c.name     AS client_name,
         c.whatsapp AS client_whatsapp,
         o.title    AS opportunity_title,
         o.total_amount AS opportunity_amount,
         q.number   AS quote_number
    FROM follow_ups f
    LEFT JOIN clients c       ON c.id = f.client_id      AND c.user_id = f.user_id
    LEFT JOIN opportunities o ON o.id = f.opportunity_id AND o.user_id = f.user_id
    LEFT JOIN quotes q        ON q.id = f.quote_id       AND q.user_id = f.user_id`;

function periodClause(period: FollowUpPeriod): string {
  switch (period) {
    case 'hoje':
      return " AND f.status = 'pendente' AND f.due_date = CURDATE()";
    case 'amanha':
      return " AND f.status = 'pendente' AND f.due_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)";
    case 'semana':
      return " AND f.status = 'pendente' AND f.due_date > DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND f.due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)";
    case 'atrasados':
      return " AND f.status = 'pendente' AND f.due_date < CURDATE()";
    default:
      return '';
  }
}

export const followUpRepository = {
  async list(userId: number, period: FollowUpPeriod = 'todos', limit = 100): Promise<FollowUpRow[]> {
    return query<FollowUpRow>(
      `${SELECT_BASE} WHERE f.user_id = ? ${periodClause(period)}
        ORDER BY f.due_date ASC, f.id ASC LIMIT ?`,
      [userId, limit],
    );
  },

  async counts(userId: number): Promise<Record<string, number>> {
    const row = await queryOne<CountRow & Record<string, number>>(
      `SELECT
         SUM(status = 'pendente' AND due_date < CURDATE())                                        AS atrasados,
         SUM(status = 'pendente' AND due_date = CURDATE())                                        AS hoje,
         SUM(status = 'pendente' AND due_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY))              AS amanha,
         SUM(status = 'pendente' AND due_date > DATE_ADD(CURDATE(), INTERVAL 1 DAY)
                                  AND due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY))            AS semana,
         SUM(status = 'pendente')                                                                 AS pendentes,
         COUNT(*)                                                                                 AS total
       FROM follow_ups WHERE user_id = ?`,
      [userId],
    );

    return {
      atrasados: Number(row?.atrasados ?? 0),
      hoje: Number(row?.hoje ?? 0),
      amanha: Number(row?.amanha ?? 0),
      semana: Number(row?.semana ?? 0),
      pendentes: Number(row?.pendentes ?? 0),
      total: Number(row?.total ?? 0),
    };
  },

  async findById(userId: number, id: number): Promise<FollowUpRow | null> {
    return queryOne<FollowUpRow>(`${SELECT_BASE} WHERE f.id = ? AND f.user_id = ? LIMIT 1`, [id, userId]);
  },

  async create(userId: number, input: FollowUpInput): Promise<number> {
    const result = await execute(
      `INSERT INTO follow_ups (user_id, client_id, opportunity_id, quote_id, type, title, notes, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        input.clientId ?? null,
        input.opportunityId ?? null,
        input.quoteId ?? null,
        input.type,
        input.title,
        input.notes ?? null,
        input.dueDate,
      ],
    );
    return result.insertId;
  },

  async updateStatus(
    userId: number,
    id: number,
    status: FollowUpStatus,
    snoozedUntil?: string | null,
  ): Promise<number> {
    const result = await execute(
      `UPDATE follow_ups
          SET status = ?,
              completed_at = IF(? IN ('concluido','cliente_fechou','cliente_recusou'), NOW(), completed_at),
              snoozed_until = ?,
              due_date = COALESCE(?, due_date)
        WHERE id = ? AND user_id = ?`,
      [status, status, snoozedUntil ?? null, snoozedUntil ?? null, id, userId],
    );
    return result.affectedRows;
  },

  async delete(userId: number, id: number): Promise<number> {
    const result = await execute('DELETE FROM follow_ups WHERE id = ? AND user_id = ?', [id, userId]);
    return result.affectedRows;
  },

  /** Evita criar dois follow-ups pendentes para a mesma oportunidade. */
  async existsPendingForOpportunity(userId: number, opportunityId: number): Promise<boolean> {
    const row = await queryOne<CountRow>(
      "SELECT COUNT(*) AS total FROM follow_ups WHERE user_id = ? AND opportunity_id = ? AND status = 'pendente'",
      [userId, opportunityId],
    );
    return (row?.total ?? 0) > 0;
  },
};
