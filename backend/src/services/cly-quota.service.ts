import { randomUUID } from 'node:crypto';
import { execute, queryOne, withTransaction, type RowDataPacket } from '../config/database';
import { userRepository } from '../repositories/user.repository';
import { subscriptionRepository } from '../repositories/subscription.repository';
import { AppError } from '../utils/app-error';

export const CLY_CONSENT = 'cly-2026-10-v1';
export interface Usage extends RowDataPacket {
 user_id: number; consent_version: string | null; month_key: string; monthly_used: number;
 round_used: number; level: number; blocked_until: Date | null; last_exhausted_at: Date | null;
 lease_token: string | null; lease_until: Date | null;
}
export function normalizeUsage(row: Usage, now: Date): Usage {
 const value = { ...row };
 if (value.month_key !== now.toISOString().slice(0, 7)) { value.month_key = now.toISOString().slice(0, 7); value.monthly_used = 0; }
 if (value.last_exhausted_at && now.getTime() - new Date(value.last_exhausted_at).getTime() >= 7 * 86400000) {
   value.level = 0; value.last_exhausted_at = null;
 }
 if (value.blocked_until && new Date(value.blocked_until) <= now) { value.blocked_until = null; value.round_used = 0; }
 return value;
}
export function quotaView(row: Usage, plan: string, now: Date) {
 const limit = plan === 'pro_max' ? 150 : plan === 'pro' ? 50 : 5;
 const used = row.monthly_used;
 const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
 return {
   planCode: plan,
   limit,
   used,
   remaining: Math.max(0, limit - used),
   blocked: used >= limit,
   resetsAt: reset.toISOString(),
   nextWaitHours: 0,
   consentRequired: row.consent_version !== CLY_CONSENT,
   consentVersion: CLY_CONSENT,
   busy: Boolean(row.lease_token && row.lease_until && new Date(row.lease_until) > now)
 };
}

async function locked(userId: number) {
 await userRepository.lock(userId);
 await execute('INSERT IGNORE INTO cly_usage (user_id) VALUES (?)', [userId]);
 const row = (await queryOne<Usage>('SELECT * FROM cly_usage WHERE user_id = ? FOR UPDATE', [userId]))!;
 const clock = (await queryOne<RowDataPacket>('SELECT UTC_TIMESTAMP(3) AS now'))!;
 const now = new Date(clock.now);
 return { row: normalizeUsage(row, now), now, plan: (await subscriptionRepository.findCurrentByUserId(userId))?.plan_code ?? 'free' };
}
export const clyQuota = {
 async status(userId: number) { return withTransaction(async () => { const { row, now, plan } = await locked(userId); return quotaView(row, plan, now); }); },
 async consent(userId: number, accepted: boolean) {
   return withTransaction(async () => {
     await locked(userId);
     await execute('UPDATE cly_usage SET consent_version = ?, consent_at = ? WHERE user_id = ?', [accepted ? CLY_CONSENT : null, accepted ? new Date() : null, userId]);
   });
 },
 async reserve(userId: number) {
   return withTransaction(async () => {
     const { row, now, plan } = await locked(userId); const view = quotaView(row, plan, now);
     if (!['free', 'pro', 'pro_max'].includes(plan)) throw new AppError('A Cly esta disponivel nos planos Pro e Pro Plus.', 403, 'AI_PLAN_REQUIRED', view);
     if (view.consentRequired) throw new AppError('Confirme o uso da Cly antes de continuar.', 403, 'AI_CONSENT_REQUIRED');
     if (view.blocked) throw new AppError('Seu limite mensal da Cly foi atingido.', 429, 'AI_LIMIT_REACHED', view);
     if (view.busy) throw new AppError('A Cly ja esta preparando uma resposta. Aguarde.', 409, 'AI_BUSY');
     const token = randomUUID();
     await execute(`UPDATE cly_usage SET month_key=?, monthly_used=?, round_used=?, level=?, blocked_until=?, last_exhausted_at=?,
       lease_token=?, lease_until=DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 60 SECOND) WHERE user_id=?`,
       [row.month_key,row.monthly_used,row.round_used,row.level,row.blocked_until,row.last_exhausted_at,token,userId]);
     return { token, plan };
   });
 },
 async finish(userId: number, token: string, _plan: string, success: boolean) {
   return withTransaction(async () => {
     const { row } = await locked(userId);
     if (row.lease_token !== token) return;
     if (success) {
       row.monthly_used++;

     }
     await execute(`UPDATE cly_usage SET month_key=?, monthly_used=?, round_used=?, level=?, blocked_until=?, last_exhausted_at=?, lease_token=NULL, lease_until=NULL WHERE user_id=?`,
       [row.month_key,row.monthly_used,row.round_used,row.level,row.blocked_until,row.last_exhausted_at,userId]);
   });
 }
};
