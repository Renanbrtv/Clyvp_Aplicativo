import { billingService } from './billing.service';
import { catalogRepository } from '../repositories/catalog.repository';
import { clientRepository } from '../repositories/client.repository';
import { opportunityRepository } from '../repositories/opportunity.repository';
import { quoteRepository } from '../repositories/quote.repository';
import { subscriptionRepository } from '../repositories/subscription.repository';
import { AppError } from '../utils/app-error';

type Resource = 'clientes' | 'oportunidades' | 'propostas' | 'catalogo';

const MESSAGES: Record<Resource, (limit: number) => string> = {
  clientes: (limit) =>
    `Seu plano permite ate ${limit} clientes. Conheca os beneficios do Pro e Pro Plus. Seus dados continuam disponiveis.`,
  oportunidades: (limit) =>
    `Seu plano permite ate ${limit} oportunidades por mes. Conheca os beneficios do Pro e Pro Plus. Seus dados continuam disponiveis.`,
  propostas: (limit) =>
    `Seu plano permite ate ${limit} propostas por mes. Conheca os beneficios do Pro e Pro Plus. Seus dados continuam disponiveis.`,
  catalogo: (limit) =>
    `Seu plano permite ate ${limit} itens no catalogo. Conheca os beneficios do Pro e Pro Plus. Seus dados continuam disponiveis.`,
};

/**
 * Aplica os limites do plano antes de criar um registro.
 *
 * `null` no limite significa ilimitado. Se o usuario nao tiver assinatura
 * (situacao que nao deveria acontecer), liberamos - nunca travamos o app
 * por causa de um dado faltando.
 */
export const planLimitService = {
  async assertCanCreate(userId: number, resource: Resource): Promise<void> {
    await billingService.sync(userId);
    const subscription = await subscriptionRepository.findCurrentByUserId(userId);
    if (!subscription) throw new AppError('Nao foi possivel verificar seu plano. Tente novamente.', 503, 'PLAN_UNAVAILABLE');

    const limit = {
      clientes: subscription.max_clients,
      oportunidades: subscription.max_opportunities_per_month,
      propostas: subscription.max_quotes_per_month,
      catalogo: subscription.max_catalog_items,
    }[resource];

    if (limit === null || limit === undefined) return;

    const used = await {
      clientes: () => clientRepository.countActive(userId),
      oportunidades: () => opportunityRepository.countCreatedThisMonth(userId),
      propostas: () => quoteRepository.countCreatedThisMonth(userId),
      catalogo: () => catalogRepository.countCatalogItems(userId),
    }[resource]();

    if (used >= limit) {
      throw new AppError(MESSAGES[resource](limit), 402, 'PLAN_LIMIT_REACHED', {
        resource,
        limit,
        used,
        planCode: subscription.plan_code,
      });
    }
  },

  /** Resumo de uso - alimenta a tela de plano no app. */
  async usage(userId: number) {
    const subscription = await subscriptionRepository.findCurrentByUserId(userId);
    if (!subscription) return null;

    const [clients, opportunities, quotes, catalog] = await Promise.all([
      clientRepository.countActive(userId),
      opportunityRepository.countCreatedThisMonth(userId),
      quoteRepository.countCreatedThisMonth(userId),
      catalogRepository.countCatalogItems(userId),
    ]);

    const describe = (used: number, limit: number | null) => ({
      used,
      limit,
      unlimited: limit === null,
      remaining: limit === null ? null : Math.max(0, limit - used),
      reached: limit !== null && used >= limit,
    });

    return {
      planCode: subscription.plan_code,
      planName: subscription.plan_name,
      clientes: describe(clients, subscription.max_clients),
      oportunidades: describe(opportunities, subscription.max_opportunities_per_month),
      propostas: describe(quotes, subscription.max_quotes_per_month),
      catalogo: describe(catalog, subscription.max_catalog_items),
    };
  },
};
