import { clientRepository } from '../repositories/client.repository';
import { dashboardRepository } from '../repositories/dashboard.repository';
import { followUpRepository, type FollowUpPeriod } from '../repositories/follow-up.repository';
import { opportunityRepository } from '../repositories/opportunity.repository';
import { settingsRepository } from '../repositories/settings.repository';
import type { FollowUpStatus } from '../config/constants';
import { AppError } from '../utils/app-error';
import { toPublicFollowUp } from './mappers2';
import { whatsappService } from './whatsapp.service';

export const followUpService = {
  /** Agenda: hoje, amanha, esta semana e atrasados. */
  async agenda(userId: number) {
    const [counts, atrasados, hoje, amanha, semana] = await Promise.all([
      followUpRepository.counts(userId),
      followUpRepository.list(userId, 'atrasados'),
      followUpRepository.list(userId, 'hoje'),
      followUpRepository.list(userId, 'amanha'),
      followUpRepository.list(userId, 'semana'),
    ]);

    return {
      counts,
      groups: [
        { key: 'atrasados', label: 'Atrasados', items: atrasados.map(toPublicFollowUp) },
        { key: 'hoje', label: 'Hoje', items: hoje.map(toPublicFollowUp) },
        { key: 'amanha', label: 'Amanha', items: amanha.map(toPublicFollowUp) },
        { key: 'semana', label: 'Esta semana', items: semana.map(toPublicFollowUp) },
      ],
    };
  },

  async list(userId: number, period: FollowUpPeriod = 'todos', limit = 100) {
    const rows = await followUpRepository.list(userId, period, limit);
    return { followUps: rows.map(toPublicFollowUp) };
  },

  async create(
    userId: number,
    input: {
      clientId?: number | null;
      opportunityId?: number | null;
      quoteId?: number | null;
      type: 'contato' | 'retorno' | 'recuperacao' | 'pos_venda' | 'garantia' | 'outro';
      title: string;
      notes?: string | null;
      dueDate: string;
    },
  ) {
    if (input.clientId) {
      const client = await clientRepository.findById(userId, input.clientId);
      if (!client) throw AppError.badRequest('Cliente nao encontrado.');
    }

    if (input.opportunityId) {
      const opportunity = await opportunityRepository.findById(userId, input.opportunityId);
      if (!opportunity) throw AppError.badRequest('Oportunidade nao encontrada.');
    }

    const id = await followUpRepository.create(userId, input);
    const created = await followUpRepository.findById(userId, id);
    if (!created) throw AppError.internal('Falha ao criar o follow-up.');

    return toPublicFollowUp(created);
  },

  /**
   * Conclui, adia ou marca o resultado do contato.
   * Alguns resultados tambem movem a oportunidade no pipeline.
   */
  async updateStatus(userId: number, id: number, status: FollowUpStatus, snoozedUntil?: string | null) {
    const existing = await followUpRepository.findById(userId, id);
    if (!existing) throw AppError.notFound('Follow-up nao encontrado.');

    await followUpRepository.updateStatus(userId, id, status, snoozedUntil ?? null);

    if (existing.client_id) {
      await clientRepository.touchContact(userId, existing.client_id);
    }

    if (existing.opportunity_id) {
      await opportunityRepository.touchContact(userId, existing.opportunity_id);

      const mapping: Partial<Record<FollowUpStatus, 'fechado' | 'perdido' | 'negociacao'>> = {
        cliente_fechou: 'fechado',
        cliente_recusou: 'perdido',
      };
      const nextStatus = mapping[status];

      if (nextStatus) {
        const { opportunityService } = await import('./opportunity.service');
        await opportunityService.changeStatus(userId, existing.opportunity_id, {
          status: nextStatus,
          note: 'Resultado do follow-up',
          registerSale: nextStatus === 'fechado',
        });
      }
    }

    const updated = await followUpRepository.findById(userId, id);
    return updated ? toPublicFollowUp(updated) : null;
  },

  async remove(userId: number, id: number) {
    const affected = await followUpRepository.delete(userId, id);
    if (affected === 0) throw AppError.notFound('Follow-up nao encontrado.');
  },

  /**
   * Recuperacao de clientes (Etapa 11): oportunidades paradas ha
   * `follow_up_days` dias ou mais, com a mensagem de retomada pronta.
   */
  async recovery(userId: number) {
    const settings = await settingsRepository.findByUserId(userId);
    const days = settings?.follow_up_days ?? 3;

    const rows = await dashboardRepository.needsAttention(userId, days, 50);

    const items = await Promise.all(
      rows.map(async (row) => {
        const message = await whatsappService.build(userId, 'recuperacao', {
          clientName: row.client_name,
          quoteNumber: row.quote_number,
          quoteTotal: Number(row.amount),
          daysWithoutContact: Number(row.dias_sem_contato),
        });

        const phone = row.client_whatsapp ?? row.client_phone ?? null;

        return {
          opportunityId: row.opportunity_id,
          clientId: row.client_id,
          clientName: row.client_name,
          whatsapp: phone,
          title: row.title,
          amount: Number(row.amount),
          status: row.status,
          daysWithoutContact: Number(row.dias_sem_contato),
          quoteId: row.quote_id,
          quoteNumber: row.quote_number,
          message,
          link: whatsappService.link(phone, message),
        };
      }),
    );

    return {
      followUpDays: days,
      totalAtRisk: items.reduce((sum, item) => sum + item.amount, 0),
      items,
    };
  },

  /** Gera a mensagem de WhatsApp de um follow-up especifico. */
  async message(userId: number, id: number) {
    const followUp = await followUpRepository.findById(userId, id);
    if (!followUp) throw AppError.notFound('Follow-up nao encontrado.');

    const kindByType: Record<string, 'follow_up' | 'recuperacao' | 'pos_venda' | 'garantia'> = {
      contato: 'follow_up',
      retorno: 'follow_up',
      recuperacao: 'recuperacao',
      pos_venda: 'pos_venda',
      garantia: 'garantia',
      outro: 'follow_up',
    };

    const message = await whatsappService.build(userId, kindByType[followUp.type] ?? 'follow_up', {
      clientName: followUp.client_name ?? 'cliente',
      quoteNumber: followUp.quote_number ?? null,
      quoteTotal: followUp.opportunity_amount === null || followUp.opportunity_amount === undefined
        ? null
        : Number(followUp.opportunity_amount),
    });

    return {
      message,
      link: whatsappService.link(followUp.client_whatsapp ?? null, message),
      phone: followUp.client_whatsapp ?? null,
    };
  },
};
