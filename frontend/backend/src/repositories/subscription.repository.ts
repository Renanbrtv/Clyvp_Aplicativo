import { execute, queryOne, tx, type PoolConnection, type RowDataPacket } from '../config/database';
import type { PlanCode, SubscriptionStatus } from '../config/constants';
import type { SubscriptionRow } from '../types/models';

export interface SubscriptionWithPlanRow extends RowDataPacket {
  id: number;
  status: SubscriptionStatus;
  is_founder: number;
  price_paid: number | null;
  started_at: Date;
  current_period_end: Date | null;
  trial_ends_at: Date | null;
  plan_id: number;
  plan_code: PlanCode;
  plan_name: string;
  plan_price: number;
  max_clients: number | null;
  max_opportunities_per_month: number | null;
  max_quotes_per_month: number | null;
  max_catalog_items: number | null;
  has_custom_pdf: number;
  has_statistics: number;
  has_follow_ups: number;
  has_ai: number;
  has_team: number;
}

export const subscriptionRepository = {
  /** Assinatura vigente do usuario (a mais recente que nao esta cancelada/expirada). */
  async findCurrentByUserId(userId: number): Promise<SubscriptionWithPlanRow | null> {
    const current = await queryOne<SubscriptionWithPlanRow>(
      `SELECT s.id,
              s.status,
              s.is_founder,
              s.price_paid,
              s.started_at,
              s.current_period_end,
              s.trial_ends_at,
              p.id   AS plan_id,
              p.code AS plan_code,
              p.name AS plan_name,
              p.price AS plan_price,
              p.max_clients,
              p.max_opportunities_per_month,
              p.max_quotes_per_month,
              p.max_catalog_items,
              p.has_custom_pdf,
              p.has_statistics,
              p.has_follow_ups,
              p.has_ai,
              p.has_team
         FROM subscriptions s
         INNER JOIN plans p ON p.id = s.plan_id
        WHERE s.user_id = ?
          AND s.status IN ('trialing', 'ativa', 'inadimplente')
        ORDER BY s.created_at DESC
        LIMIT 1`,
      [userId],
    );
    if (current && current.plan_code !== 'free' && current.current_period_end && new Date(current.current_period_end).getTime() <= Date.now()) {
      const free = await queryOne<RowDataPacket>("SELECT * FROM plans WHERE code='free'");
      if (free) return { ...current, plan_id: free.id, plan_code: 'free', plan_name: free.name, plan_price: 0,
        max_clients: free.max_clients, max_quotes_per_month: free.max_quotes_per_month,
        max_opportunities_per_month: free.max_opportunities_per_month, max_catalog_items: free.max_catalog_items,
        has_custom_pdf: free.has_custom_pdf, has_statistics: free.has_statistics, has_follow_ups: free.has_follow_ups,
        has_ai: free.has_ai, has_team: 0, price_paid: null, is_founder: 0 };
    }
    return current;
  },

  async findRawByUserId(userId: number): Promise<SubscriptionRow | null> {
    return queryOne<SubscriptionRow>(
      `SELECT * FROM subscriptions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1`,
      [userId],
    );
  },

  /** Assina o plano Free automaticamente no cadastro. */
  async createInTransaction(
    connection: PoolConnection,
    userId: number,
    planId: number,
    status: SubscriptionStatus = 'ativa',
    options: { isFounder?: boolean; pricePaid?: number | null } = {},
  ): Promise<number> {
    const result = await tx.execute(
      connection,
      `INSERT INTO subscriptions (user_id, plan_id, status, is_founder, price_paid, started_at, current_period_start)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, planId, status, options.isFounder ? 1 : 0, options.pricePaid ?? null],
    );
    return result.insertId;
  },

  async updateStatus(subscriptionId: number, status: SubscriptionStatus): Promise<void> {
    await execute(
      `UPDATE subscriptions
          SET status = ?, canceled_at = IF(? = 'cancelada', NOW(), canceled_at)
        WHERE id = ?`,
      [status, status, subscriptionId],
    );
  },
};
