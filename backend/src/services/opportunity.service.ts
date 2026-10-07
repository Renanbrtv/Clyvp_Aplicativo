import { userRepository } from '../repositories/user.repository';
import { withTransaction } from '../config/database';
import type { OpportunityStatus } from '../config/constants';
import { clientRepository } from '../repositories/client.repository';
import { followUpRepository } from '../repositories/follow-up.repository';
import { opportunityRepository } from '../repositories/opportunity.repository';
import { quoteRepository } from '../repositories/quote.repository';
import { saleRepository } from '../repositories/sale.repository';
import { settingsRepository } from '../repositories/settings.repository';
import { AppError } from '../utils/app-error';
import { buildPagination, paginationMeta } from '../utils/pagination';
import type {
  ChangeStatusInput,
  CreateOpportunityInput,
  UpdateOpportunityInput,
} from '../validators/opportunity.validator';
import { toPublicOpportunity, toPublicQuote } from './mappers2';
import { notificationService } from './notification.service';
import { planLimitService } from './plan-limit.service';

export const opportunityService = {
  async list(
    userId: number,
    options: {
      status?: OpportunityStatus;
      clientId?: number;
      search?: string;
      open?: boolean;
      page?: number;
      perPage?: number;
    },
  ) {
    const pagination = buildPagination(options.page, options.perPage);
    const { rows, total } = await opportunityRepository.list(userId, { ...options, pagination });

    return { opportunities: rows.map(toPublicOpportunity), meta: paginationMeta(pagination, total) };
  },

  /** Pipeline agrupado por status - a tela de Oportunidades. */
  async pipeline(userId: number) {
    const pagination = buildPagination(1, 100);
    const { rows } = await opportunityRepository.list(userId, { pagination });

    const order: OpportunityStatus[] = [
      'novo_contato',
      'proposta_enviada',
      'negociacao',
      'aguardando_pagamento',
      'fechado',
      'perdido',
    ];

    const opportunities = rows.map(toPublicOpportunity);

    return {
      columns: order.map((status) => {
        const items = opportunities.filter((item) => item.status === status);
        return {
          status,
          label: items[0]?.statusLabel ?? labelOf(status),
          count: items.length,
          total: items.reduce((sum, item) => sum + item.totalAmount, 0),
          opportunities: items,
        };
      }),
      totals: {
        open: opportunities
          .filter((item) => item.status !== 'fechado' && item.status !== 'perdido')
          .reduce((sum, item) => sum + item.totalAmount, 0),
        count: opportunities.length,
      },
    };
  },

  async getById(userId: number, id: number) {
    const row = await opportunityRepository.findById(userId, id);
    if (!row) throw AppError.notFound('Oportunidade nao encontrada.');

    const pagination = buildPagination(1, 20);
    const [quotes, history] = await Promise.all([
      quoteRepository.list(userId, { opportunityId: id, pagination }),
      opportunityRepository.history(userId, id),
    ]);

    return {
      opportunity: toPublicOpportunity(row),
      quotes: quotes.rows.map((quote) => toPublicQuote(quote)),
      history: history.map((item) => ({
        id: item.id,
        fromStatus: item.from_status,
        toStatus: item.to_status,
        note: item.note,
        createdAt: item.created_at,
      })),
    };
  },

  /**
   * Cria a oportunidade. Aceita cliente existente ou cria um novo na hora -
   * e o caminho rapido da tela "Nova oportunidade".
   */
  async create(userId: number, input: CreateOpportunityInput) {
    return withTransaction(async () => {
      await userRepository.lock(userId);
    await planLimitService.assertCanCreate(userId, 'oportunidades');

    const opportunityId = await withTransaction(async () => {
      let clientId = input.clientId ?? null;

      if (!clientId && input.newClient) {
        await planLimitService.assertCanCreate(userId, 'clientes');
        clientId = await clientRepository.create(userId, {
          name: input.newClient.name,
          phone: input.newClient.phone ?? null,
          whatsapp: input.newClient.whatsapp ?? input.newClient.phone ?? null,
          origin: 'whatsapp',
        });
      }

      if (!clientId) throw AppError.badRequest('Informe o cliente.');

      const client = await clientRepository.findById(userId, clientId);
      if (!client) throw AppError.badRequest('Cliente nao encontrado.');

      const id = await opportunityRepository.create(userId, {
        clientId,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? 'novo_contato',
        source: input.source ?? null,
        totalAmount: input.totalAmount ?? 0,
        expectedCloseDate: input.expectedCloseDate ?? null,
      });

      await opportunityRepository.addHistory(userId, id, null, input.status ?? 'novo_contato', 'Oportunidade criada');
      await clientRepository.touchContact(userId, clientId);

      return id;
    });

    return opportunityService.getById(userId, opportunityId);
    });
  },

  async update(userId: number, id: number, input: UpdateOpportunityInput) {
    const existing = await opportunityRepository.findById(userId, id);
    if (!existing) throw AppError.notFound('Oportunidade nao encontrada.');

    await opportunityRepository.update(userId, id, input);
    return opportunityService.getById(userId, id);
  },

  /**
   * Muda o status e registra no historico.
   * Fechando a oportunidade, opcionalmente registra a venda e cria o
   * lembrete de pos-venda.
   */
  async changeStatus(userId: number, id: number, input: ChangeStatusInput) {
    return withTransaction(async () => {
      await userRepository.lock(userId);
    const existing = await opportunityRepository.findById(userId, id);
    if (!existing) throw AppError.notFound('Oportunidade nao encontrada.');

    if (existing.status === input.status) {
      return opportunityService.getById(userId, id);
    }

    await opportunityRepository.updateStatus(userId, id, input.status, input.lostReason ?? null);
    await opportunityRepository.addHistory(userId, id, existing.status, input.status, input.note ?? null);

    if (input.status === 'fechado') {
      const amount = input.amount ?? Number(existing.total_amount);

      if (input.registerSale !== false && amount > 0) {
        await saleRepository.create(userId, {
          clientId: existing.client_id,
          opportunityId: id,
          description: existing.title,
          amount,
          paymentMethod: input.paymentMethod ?? null,
        });
        await clientRepository.addPurchase(userId, existing.client_id, amount);

        await notificationService.push(userId, {
          type: 'venda',
          title: 'Venda registrada',
          message: `Voce fechou ${formatCurrency(amount)} com ${existing.client_name ?? 'o cliente'}.`,
          payload: { opportunityId: id },
        });
      }

      // Pos-venda: lembrete para 30 dias depois.
      const settings = await settingsRepository.findByUserId(userId);
      if (settings) {
        await followUpRepository.create(userId, {
          clientId: existing.client_id,
          opportunityId: id,
          type: 'pos_venda',
          title: `Verificar pos-venda de ${existing.client_name ?? 'cliente'}`,
          notes: 'Conferir se esta tudo certo e abrir espaco para uma nova venda.',
          dueDate: addDaysIso(30),
        });
      }
    }

    if (input.status === 'proposta_enviada') {
      const settings = await settingsRepository.findByUserId(userId);
      const days = settings?.follow_up_days ?? 3;
      const alreadyHas = await followUpRepository.existsPendingForOpportunity(userId, id);

      if (!alreadyHas) {
        await followUpRepository.create(userId, {
          clientId: existing.client_id,
          opportunityId: id,
          type: 'recuperacao',
          title: `Retomar contato com ${existing.client_name ?? 'cliente'}`,
          notes: 'Proposta enviada. Confirmar se o cliente analisou.',
          dueDate: addDaysIso(days),
        });
      }
    }

    return opportunityService.getById(userId, id);
    });
  },

  async registerContact(userId: number, id: number) {
    const existing = await opportunityRepository.findById(userId, id);
    if (!existing) throw AppError.notFound('Oportunidade nao encontrada.');

    await opportunityRepository.touchContact(userId, id);
    await clientRepository.touchContact(userId, existing.client_id);

    return opportunityService.getById(userId, id);
  },

  async remove(userId: number, id: number) {
    const affected = await opportunityRepository.softDelete(userId, id);
    if (affected === 0) throw AppError.notFound('Oportunidade nao encontrada.');
  },
};

function labelOf(status: OpportunityStatus): string {
  const labels: Record<OpportunityStatus, string> = {
    novo_contato: 'Novo contato',
    proposta_enviada: 'Proposta enviada',
    negociacao: 'Negociacao',
    aguardando_pagamento: 'Aguardando pagamento',
    fechado: 'Fechado',
    perdido: 'Perdido',
  };
  return labels[status];
}

function addDaysIso(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000);
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value: number): string {
  return `R$ ${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}
