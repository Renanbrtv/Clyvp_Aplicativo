import { planRepository } from '../repositories/plan.repository';
import { subscriptionRepository } from '../repositories/subscription.repository';
import { AppError } from '../utils/app-error';
import { planLimitService } from './plan-limit.service';
import { toPublicPlan, toPublicSubscription } from './mappers';

/**
 * Planos e assinatura.
 *
 * O preco de fundador e vitalicio para quem entra enquanto houver vaga:
 * o valor fica gravado em `subscriptions.price_paid` e a flag `is_founder`
 * impede que um reajuste futuro atinja essas contas.
 *
 * A cobranca em si (Etapa 15) ainda nao existe - falta escolher o gateway.
 * As colunas `external_provider` e `external_subscription_id` ja estao prontas.
 */
export const subscriptionService = {
  async listPlans() {
    const plans = await planRepository.listActive();

    const withFounders = await Promise.all(
      plans.map(async (plan) => {
        const taken = plan.founder_slots === null ? 0 : await planRepository.countFounders(plan.id);
        return toPublicPlan(plan, taken);
      }),
    );

    return withFounders;
  },

  async getCurrent(userId: number) {
    const subscription = await subscriptionRepository.findCurrentByUserId(userId);
    if (!subscription) {
      throw AppError.notFound('Nenhuma assinatura ativa encontrada.');
    }

    const usage = await planLimitService.usage(userId);

    return { ...toPublicSubscription(subscription), usage };
  },

  /**
   * Prepara a troca de plano.
   *
   * Hoje devolve o que o usuario pagaria e reserva a condicao de fundador,
   * mas NAO cobra: o checkout entra quando o gateway for escolhido.
   */
  async previewUpgrade(userId: number, planCode: 'free' | 'pro' | 'pro_max') {
    const plan = await planRepository.findByCode(planCode);
    if (!plan) throw AppError.notFound('Plano nao encontrado.');

    const current = await subscriptionRepository.findCurrentByUserId(userId);
    const taken = plan.founder_slots === null ? 0 : await planRepository.countFounders(plan.id);
    const publicPlan = toPublicPlan(plan, taken);

    return {
      currentPlan: current?.plan_code ?? null,
      targetPlan: publicPlan,
      priceToday: publicPlan.effectivePrice,
      keepsFounderPrice: publicPlan.founder.available,
      checkoutReady: false,
      // O texto sempre deixa claro que a cobranca ainda nao existe: anunciar
      // uma compra que nao acontece e motivo de recusa na loja.
      message: 'Confira os beneficios dos planos. A compra depende da disponibilidade na Google Play.',
    };
  },
};
