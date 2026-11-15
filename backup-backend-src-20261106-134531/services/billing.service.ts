import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import { execute, queryOne, withTransaction, type RowDataPacket } from '../config/database';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/app-error';

interface BillingRow extends RowDataPacket { app_user_id: string; checked_at: Date | null }
type Entitlement = { expires_date?: string | null; grace_period_expires_date?: string | null; product_identifier?: string };
type StoreSubscription = { store?: string; is_sandbox?: boolean; refunded_at?: string | null; expires_date?: string | null };
export function entitlementPlan(subscriber: { entitlements?: Record<string, Entitlement>; subscriptions?: Record<string, StoreSubscription> }, allowSandbox: boolean, now = Date.now()) {
 for (const [entitlement, product, code] of [['clyvo_pro_plus','clyvo_pro_plus_monthly','pro_max'], ['clyvo_pro','clyvo_pro_monthly','pro']] as const) {
   const value = subscriber.entitlements?.[entitlement];
   if (!value || value.product_identifier?.split(':')[0] !== product) continue;
   const sub = subscriber.subscriptions?.[value.product_identifier!];
   if (!sub || sub.store !== 'play_store' || sub.refunded_at || (sub.is_sandbox && !allowSandbox)) continue;
   const expiry = Math.max(Date.parse(value.expires_date ?? ''), Date.parse(value.grace_period_expires_date ?? '') || 0);
   if (Number.isFinite(expiry) && expiry > now) return { code, until: new Date(expiry) };
 }
 return { code: 'free' as const, until: null };
}
const inFlight = new Map<number, Promise<void>>();
export const billingService = {
 get configured() { return Boolean(env.REVENUECAT_SECRET_KEY); },
 async identity(userId: number) {
   await execute('INSERT IGNORE INTO billing_accounts (user_id, app_user_id) VALUES (?, ?)', [userId,randomUUID()]);
   return (await queryOne<BillingRow>('SELECT * FROM billing_accounts WHERE user_id=?', [userId]))!;
 },
 async sync(userId: number, force = false): Promise<void> {
   if (!billingService.configured) return;
   const existing = inFlight.get(userId); if (existing) return existing;
   const task = (async () => {
     const account = await billingService.identity(userId);
     if (!force && account.checked_at && Date.now() - new Date(account.checked_at).getTime() < 60000) return;
     let subscriber: Parameters<typeof entitlementPlan>[0];
     try {
       const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(account.app_user_id)}`, {
         headers: { Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}`, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
       if (!response.ok && response.status !== 404) throw new Error('Billing unavailable');
       const body = (response.status === 404 ? { subscriber: { entitlements: {}, subscriptions: {} } } : await response.json()) as { subscriber?: typeof subscriber };
       if (!body.subscriber || !body.subscriber.entitlements || !body.subscriber.subscriptions) throw new Error('Invalid billing response');
       subscriber = body.subscriber;
     } catch { throw new AppError('Nao foi possivel verificar a assinatura. Tente novamente.', 503, 'BILLING_UNAVAILABLE'); }
     const verified = entitlementPlan(subscriber, env.BILLING_ALLOW_SANDBOX);
     await withTransaction(async () => {
       await userRepository.lock(userId);
       const current = await queryOne<RowDataPacket>('SELECT id, plan_id FROM subscriptions WHERE user_id=? ORDER BY id DESC LIMIT 1 FOR UPDATE', [userId]);
       const plan = await queryOne<RowDataPacket>('SELECT id FROM plans WHERE code=?', [verified.code]);
       if (!current || !plan) throw AppError.notFound('Plano nao encontrado.');
       await execute(`UPDATE subscriptions SET plan_id=?, status='ativa', is_founder=0, price_paid=NULL,
         current_period_end=?, external_provider='revenuecat', external_subscription_id=? WHERE id=?`,
         [plan.id,verified.until,account.app_user_id,current.id]);
       await execute('UPDATE billing_accounts SET checked_at=UTC_TIMESTAMP(3) WHERE user_id=?',[userId]);
     });
   })();
   inFlight.set(userId,task); try { await task; } finally { inFlight.delete(userId); }
 }
};
