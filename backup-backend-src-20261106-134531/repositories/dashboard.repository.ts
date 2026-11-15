import { query, queryOne, type RowDataPacket } from '../config/database';

export interface PeriodRange {
  start: string;
  end: string;
}

export interface SumCountRow extends RowDataPacket {
  total: number | null;
  quantidade: number;
}

export interface StatusCountRow extends RowDataPacket {
  status: string;
  quantidade: number;
  total: number | null;
}

export interface SeriesRow extends RowDataPacket {
  bucket: number;
  total: number | null;
}

export interface AttentionRow extends RowDataPacket {
  opportunity_id: number;
  client_id: number;
  client_name: string;
  client_whatsapp: string | null;
  client_phone: string | null;
  title: string;
  amount: number;
  status: string;
  last_contact_at: Date | null;
  dias_sem_contato: number;
  quote_id: number | null;
  quote_number: number | null;
}

/**
 * Consultas agregadas do dashboard.
 * Todas filtram por user_id - o resumo de um usuario nunca mistura
 * dados de outro.
 */
export const dashboardRepository = {
  /** Vendas fechadas dentro do periodo. */
  async salesInPeriod(userId: number, period: PeriodRange): Promise<SumCountRow> {
    const row = await queryOne<SumCountRow>(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS quantidade
         FROM sales
        WHERE user_id = ?
          AND deleted_at IS NULL
          AND sold_at >= ? AND sold_at < ?`,
      [userId, period.start, period.end],
    );
    return row ?? ({ total: 0, quantidade: 0 } as SumCountRow);
  },

  /**
   * Vendas agrupadas por semana do mes - alimenta o mini grafico do
   * card de destaque. Retorna somente as semanas que tiveram venda;
   * o app completa as demais com zero.
   */
  async salesByWeek(userId: number, period: PeriodRange): Promise<SeriesRow[]> {
    return query<SeriesRow>(
      `SELECT LEAST(FLOOR((DAYOFMONTH(sold_at) - 1) / 7) + 1, 5) AS bucket,
              COALESCE(SUM(amount), 0) AS total
         FROM sales
        WHERE user_id = ?
          AND deleted_at IS NULL
          AND sold_at >= ? AND sold_at < ?
        GROUP BY bucket
        ORDER BY bucket ASC`,
      [userId, period.start, period.end],
    );
  },

  /** Oportunidades abertas (nem fechadas nem perdidas) - o "dinheiro na mesa". */
  async openOpportunities(userId: number): Promise<SumCountRow> {
    const row = await queryOne<SumCountRow>(
      `SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS quantidade
         FROM opportunities
        WHERE user_id = ?
          AND deleted_at IS NULL
          AND status NOT IN ('fechado', 'perdido')`,
      [userId],
    );
    return row ?? ({ total: 0, quantidade: 0 } as SumCountRow);
  },

  /** Quantidade e valor por status - alimenta o pipeline. */
  async opportunitiesByStatus(userId: number): Promise<StatusCountRow[]> {
    return query<StatusCountRow>(
      `SELECT status, COUNT(*) AS quantidade, COALESCE(SUM(total_amount), 0) AS total
         FROM opportunities
        WHERE user_id = ? AND deleted_at IS NULL
        GROUP BY status`,
      [userId],
    );
  },

  /** Orcamentos enviados e ainda sem resposta. */
  async pendingQuotes(userId: number): Promise<SumCountRow> {
    const row = await queryOne<SumCountRow>(
      `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS quantidade
         FROM quotes
        WHERE user_id = ?
          AND deleted_at IS NULL
          AND status IN ('enviado', 'visualizado')`,
      [userId],
    );
    return row ?? ({ total: 0, quantidade: 0 } as SumCountRow);
  },

  async clientsCount(userId: number, period: PeriodRange): Promise<SumCountRow> {
    const row = await queryOne<SumCountRow>(
      `SELECT COUNT(*) AS quantidade,
              COALESCE(SUM(created_at >= ? AND created_at < ?), 0) AS total
         FROM clients
        WHERE user_id = ? AND deleted_at IS NULL`,
      [period.start, period.end, userId],
    );
    return row ?? ({ total: 0, quantidade: 0 } as SumCountRow);
  },

  /**
   * Oportunidades paradas ha mais de `days` dias.
   * E a base da secao "Precisa da sua atencao" e da recuperacao de clientes.
   */
  async needsAttention(userId: number, days: number, limit = 10): Promise<AttentionRow[]> {
    return query<AttentionRow>(
      `SELECT o.id            AS opportunity_id,
              c.id            AS client_id,
              c.name          AS client_name,
              c.whatsapp      AS client_whatsapp,
              c.phone         AS client_phone,
              o.title,
              o.total_amount  AS amount,
              o.status,
              o.last_contact_at,
              DATEDIFF(NOW(), COALESCE(o.last_contact_at, o.created_at)) AS dias_sem_contato,
              (SELECT q.id
                 FROM quotes q
                WHERE q.opportunity_id = o.id AND q.user_id = o.user_id AND q.deleted_at IS NULL
                ORDER BY q.created_at DESC
                LIMIT 1)      AS quote_id,
              (SELECT q.number
                 FROM quotes q
                WHERE q.opportunity_id = o.id AND q.user_id = o.user_id AND q.deleted_at IS NULL
                ORDER BY q.created_at DESC
                LIMIT 1)      AS quote_number
         FROM opportunities o
         INNER JOIN clients c ON c.id = o.client_id AND c.user_id = o.user_id
        WHERE o.user_id = ?
          AND o.deleted_at IS NULL
          AND o.status IN ('proposta_enviada', 'negociacao', 'aguardando_pagamento')
          AND DATEDIFF(NOW(), COALESCE(o.last_contact_at, o.created_at)) >= ?
        ORDER BY dias_sem_contato DESC, o.total_amount DESC
        LIMIT ?`,
      [userId, days, limit],
    );
  },
};
