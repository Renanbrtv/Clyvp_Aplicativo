import { closePool, execute, queryOne, withTransaction, type RowDataPacket } from '../config/database';
import { REVIEW_PROVIDER, hasReviewAccess } from '../services/review-access';

async function main() {
  const [action, emailArg, idArg, ...extra] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  if (!['status', 'grant', 'revoke'].includes(action) || !email || !email.includes('@') || extra.length ||
      (action !== 'status' && (!idArg || !/^[1-9]\d*$/.test(idArg) || !Number.isSafeInteger(Number(idArg))))) {
    throw new Error('Uso: review-access status EMAIL | grant EMAIL ID | revoke EMAIL ID');
  }
  await withTransaction(async () => {
    const user = await queryOne<RowDataPacket>(
      'SELECT id,email FROM users WHERE email=? AND deleted_at IS NULL FOR UPDATE', [email]);
    if (!user || (idArg && user.id !== Number(idArg))) throw new Error('Conta/ID não corresponde. Nenhuma alteração.');
    const current = await queryOne<RowDataPacket>(
      'SELECT s.id,s.external_provider,s.external_subscription_id,s.status,p.code AS plan_code FROM subscriptions s JOIN plans p ON p.id=s.plan_id WHERE s.user_id=? ORDER BY s.id DESC LIMIT 1 FOR UPDATE', [user.id]);
    if (!current) throw new Error('Conta sem assinatura. Nenhuma alteração.');
    if (action === 'status') {
      console.log(JSON.stringify({ userId: user.id, email: user.email, plan: current.plan_code,
        status: current.status, reviewAccess: hasReviewAccess(current) }));
      return;
    }
    if (action === 'grant') {
      if (hasReviewAccess(current)) { console.log('A cortesia já está ativa.'); return; }
      if (current.plan_code !== 'free' || current.status !== 'ativa' ||
          current.external_provider || current.external_subscription_id) {
        throw new Error('Concessão restrita a conta Free ativa, sem vínculo de cobrança. Use uma conta de teste dedicada.');
      }
    } else if (!hasReviewAccess(current)) {
      throw new Error('Esta conta não possui cortesia de análise. Nenhuma alteração.');
    }
    const target = await queryOne<RowDataPacket>(
      'SELECT id FROM plans WHERE code=? AND is_active=1', [action === 'grant' ? 'pro_max' : 'free']);
    if (!target) throw new Error('Plano de destino indisponível.');
    await execute(
      'UPDATE subscriptions SET plan_id=?,status=\'ativa\',is_founder=0,price_paid=0,current_period_start=UTC_TIMESTAMP(),current_period_end=NULL,trial_ends_at=NULL,canceled_at=NULL,external_provider=?,external_subscription_id=NULL WHERE id=?',
      [target.id, action === 'grant' ? REVIEW_PROVIDER : null, current.id]);
    await execute('UPDATE billing_accounts SET checked_at=NULL WHERE user_id=?', [user.id]);
    console.log(JSON.stringify({ userId: user.id, action, plan: action === 'grant' ? 'pro_max' : 'free' }));
  });
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Falha.'); process.exitCode=1; }).finally(closePool);
