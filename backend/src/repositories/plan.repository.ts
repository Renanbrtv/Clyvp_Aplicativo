import { query, queryOne } from '../config/database';
import type { PlanCode } from '../config/constants';
import type { CountRow, PlanRow } from '../types/models';

export const planRepository = {
  async findByCode(code: PlanCode): Promise<PlanRow | null> {
    return queryOne<PlanRow>('SELECT * FROM plans WHERE code = ? LIMIT 1', [code]);
  },

  async findById(id: number): Promise<PlanRow | null> {
    return queryOne<PlanRow>('SELECT * FROM plans WHERE id = ? LIMIT 1', [id]);
  },

  async listActive(): Promise<PlanRow[]> {
    return query<PlanRow>('SELECT * FROM plans WHERE is_active = 1 ORDER BY sort_order ASC');
  },

  /** Quantas vagas de fundador ja foram ocupadas neste plano. */
  async countFounders(planId: number): Promise<number> {
    const row = await queryOne<CountRow>(
      `SELECT COUNT(*) AS total FROM subscriptions
        WHERE plan_id = ? AND is_founder = 1 AND status IN ('trialing','ativa','inadimplente')`,
      [planId],
    );
    return row?.total ?? 0;
  },
};
