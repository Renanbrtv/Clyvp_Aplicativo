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
 const paid = plan !== 'free'; const limit = paid ? (plan === 'pro_max' ? 150 : 50) : 3;
 const used = paid ? row.monthly_used : row.round_used;
 const reset = paid ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) : row.blocked_until;
 return { planCode: plan, limit, used, remaining: Math.max(0, limit - used),
   blocked: paid ? used >= limit : Boolean(row.blocked_until && new Date(row.blocked_until) > now),
   resetsAt: reset ? new Date(reset).toISOString() : null,
   nextWaitHours: Math.min(8, 2 ** (Math.min(row.level, 2) + 1)),
   consentRequired: row.consent_version !== CLY_CONSENT, consentVersion: CLY_CONSENT,
   busy: Boolean(row.lease_token && row.lease_until && new Date(row.lease_until) > now) };
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
     if (view.consentRequired) throw new AppError('Confirme o envio do texto ao provedor antes de usar a Cly.', 403, 'AI_CONSENT_REQUIRED');
     if (view.blocked) throw new AppError('Seu limite da Cly foi atingido. Confira o horario de liberacao.', 429, 'AI_LIMIT_REACHED', view);
     if (view.busy) throw new AppError('A Cly ja esta preparando uma resposta. Aguarde.', 409, 'AI_BUSY');
     const token = randomUUID();
     await execute(`UPDATE cly_usage SET month_key=?, monthly_used=?, round_used=?, level=?, blocked_until=?, last_exhausted_at=?,
       lease_token=?, lease_until=DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 60 SECOND) WHERE user_id=?`,
       [row.month_key,row.monthly_used,row.round_used,row.level,row.blocked_until,row.last_exhausted_at,token,userId]);
     return { token, plan };
   });
 },
 async finish(userId: number, token: string, plan: string, success: boolean) {
   return withTransaction(async () => {
     const { row, now } = await locked(userId);
     if (row.lease_token !== token) return;
     if (success) {
       row.monthly_used++;
       if (plan === 'free') {
         row.round_used++;
         if (row.round_used >= 3) {
           row.blocked_until = new Date(now.getTime() + Math.min(8, 2 ** (Math.min(row.level, 2) + 1)) * 3600000);
           row.level = Math.min(row.level + 1, 3); row.last_exhausted_at = now;
         }
       }
     }
     await execute(`UPDATE cly_usage SET month_key=?, monthly_used=?, round_used=?, level=?, blocked_until=?, last_exhausted_at=?, lease_token=NULL, lease_until=NULL WHERE user_id=?`,
       [row.month_key,row.monthly_used,row.round_used,row.level,row.blocked_until,row.last_exhausted_at,userId]);
   });
 }
};
