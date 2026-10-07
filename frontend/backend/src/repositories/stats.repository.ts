import { query, queryOne, type RowDataPacket } from '../config/database';
import type { PeriodRange } from './dashboard.repository';

export interface MetricRow extends RowDataPacket {
  total: number | null;
  quantidade: number;
}

export interface RankingRow extends RowDataPacket {
  nome: string;
  quantidade: number;
  total: number | null;
}

export interface MonthRow extends RowDataPacket {
  periodo: string;
  total: number | null;
  quantidade: number;
}

/** Consultas da tela "Resultados" (Etapa 12). Todas filtram por user_id. */
export const statsRepository = {
  async sales(userId: number, period: PeriodRange): Promise<MetricRow> {
    const row = await queryOne<MetricRow>(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS quantidade
         FROM sales
        WHERE user_id = ? AND deleted_at IS NULL AND sold_at >= ? AND sold_at < ?`,
      [userId, period.start, period.end],
    );
    return row ?? ({ total: 0, quantidade: 0 } as MetricRow);
  },

  /** Oportunidades criadas no periodo, agrupadas por status. */
  async opportunitiesByStatus(userId: number, period: PeriodRange): Promise<RankingRow[]> {
    return query<RankingRow>(
      `SELECT status AS nome, COUNT(*) AS quantidade, COALESCE(SUM(total_amount), 0) AS total
         FROM opportunities
        WHERE user_id = ? AND deleted_at IS NULL AND created_at >= ? AND created_at < ?
        GROUP BY status`,
      [userId, period.start, period.end],
    );
  },

  async quotesByStatus(userId: number, period: PeriodRange): Promise<RankingRow[]> {
    return query<RankingRow>(
      `SELECT status AS nome, COUNT(*) AS quantidade, COALESCE(SUM(total), 0) AS total
         FROM quotes
        WHERE user_id = ? AND deleted_at IS NULL AND created_at >= ? AND created_at < ?
        GROUP BY status`,
      [userId, period.start, period.end],
    );
  },

  /** Valor ainda em negociacao - o "dinheiro na mesa". */
  async openPipeline(userId: number): Promise<MetricRow> {
    const row = await queryOne<MetricRow>(
      `SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS quantidade
         FROM opportunities
        WHERE user_id = ? AND deleted_at IS NULL AND status NOT IN ('fechado','perdido')`,
      [userId],
    );
    return row ?? ({ total: 0, quantidade: 0 } as MetricRow);
  },

  async lostValue(userId: number, period: PeriodRange): Promise<MetricRow> {
    const row = await queryOne<MetricRow>(
      `SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS quantidade
         FROM opportunities
        WHERE user_id = ? AND deleted_at IS NULL AND status = 'perdido'
          AND COALESCE(closed_at, updated_at) >= ? AND COALESCE(closed_at, updated_at) < ?`,
      [userId, period.start, period.end],
    );
    return row ?? ({ total: 0, quantidade: 0 } as MetricRow);
  },

  async newClients(userId: number, period: PeriodRange): Promise<MetricRow> {
    const row = await queryOne<MetricRow>(
      `SELECT COUNT(*) AS quantidade, 0 AS total
         FROM clients
        WHERE user_id = ? AND deleted_at IS NULL AND created_at >= ? AND created_at < ?`,
      [userId, period.start, period.end],
    );
    return row ?? ({ total: 0, quantidade: 0 } as MetricRow);
  },

  async recurringClients(userId: number): Promise<MetricRow> {
    const row = await queryOne<MetricRow>(
      `SELECT COUNT(*) AS quantidade, COALESCE(SUM(total_purchased), 0) AS total
         FROM clients
        WHERE user_id = ? AND deleted_at IS NULL AND purchases_count >= 2`,
      [userId],
    );
    return row ?? ({ total: 0, quantidade: 0 } as MetricRow);
  },

  /** Produtos e servicos mais vendidos, a partir dos itens das propostas aceitas. */
  async topItems(
    userId: number,
    period: PeriodRange,
    itemType: 'produto' | 'servico',
    limit = 5,
  ): Promise<RankingRow[]> {
    return query<RankingRow>(
      `SELECT qi.description AS nome,
              SUM(qi.quantity) AS quantidade,
              COALESCE(SUM(qi.total), 0) AS total
         FROM quote_items qi
         INNER JOIN quotes q ON q.id = qi.quote_id AND q.user_id = qi.user_id
        WHERE qi.user_id = ?
          AND qi.item_type = ?
          AND q.deleted_at IS NULL
          AND q.status = 'aceito'
          AND q.created_at >= ? AND q.created_at < ?
        GROUP BY qi.description
        ORDER BY total DESC
        LIMIT ?`,
      [userId, itemType, period.start, period.end, limit],
    );
  },

  /** Serie dos ultimos N meses para o grafico de vendas. */
  async monthlySales(userId: number, months = 6): Promise<MonthRow[]> {
    return query<MonthRow>(
      `SELECT DATE_FORMAT(sold_at, '%Y-%m') AS periodo,
              COALESCE(SUM(amount), 0) AS total,
              COUNT(*) AS quantidade
         FROM sales
        WHERE user_id = ? AND deleted_at IS NULL
          AND sold_at >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL ? MONTH)
        GROUP BY periodo
        ORDER BY periodo ASC`,
      [userId, months - 1],
    );
  },
};
