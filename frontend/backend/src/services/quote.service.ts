import { userRepository } from '../repositories/user.repository';
import { withTransaction } from '../config/database';
import { catalogRepository } from '../repositories/catalog.repository';
import { clientRepository } from '../repositories/client.repository';
import { companyRepository } from '../repositories/company.repository';
import { opportunityRepository } from '../repositories/opportunity.repository';
import { quoteRepository, type QuoteItemInput } from '../repositories/quote.repository';
import { settingsRepository } from '../repositories/settings.repository';
import { subscriptionRepository } from '../repositories/subscription.repository';
import type { QuoteStatus } from '../config/constants';
import type { QuoteRow } from '../types/models2';
import { AppError } from '../utils/app-error';
import { buildPagination, paginationMeta } from '../utils/pagination';
import type { CreateQuoteInput, UpdateQuoteInput } from '../validators/quote.validator';
import { toPublicQuote } from './mappers2';
import { planLimitService } from './plan-limit.service';
import { whatsappService } from './whatsapp.service';

/** Arredonda para 2 casas sem erro de ponto flutuante. */
const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

function computeTotals(
  items: Array<QuoteItemInput>,
  discountType: 'valor' | 'percentual',
  discountAmount: number,
) {
  const computed = items.map((item) => {
    const gross = item.quantity * item.unitPrice;
    const total = round2(Math.max(0, gross - (item.discount ?? 0)));
    return { ...item, total };
  });

  const subtotal = round2(computed.reduce((sum, item) => sum + item.total, 0));

  const discountValue =
    discountType === 'percentual'
      ? round2((subtotal * Math.min(discountAmount, 100)) / 100)
      : round2(Math.min(discountAmount, subtotal));

  return { items: computed, subtotal, discountValue, total: round2(subtotal - discountValue) };
}

export const quoteService = {
  async list(
    userId: number,
    options: {
      status?: QuoteStatus;
      type?: 'orcamento' | 'proposta';
      clientId?: number;
      opportunityId?: number;
      pending?: boolean;
      page?: number;
      perPage?: number;
    },
  ) {
    await quoteRepository.expireOverdue(userId);

    const pagination = buildPagination(options.page, options.perPage);
    const { rows, total } = await quoteRepository.list(userId, { ...options, pagination });

    return { quotes: rows.map((row) => toPublicQuote(row)), meta: paginationMeta(pagination, total) };
  },

  async getById(userId: number, id: number) {
    const row = await quoteRepository.findById(userId, id);
    if (!row) throw AppError.notFound('Orcamento nao encontrado.');

    const items = await quoteRepository.items(userId, id);
    return toPublicQuote(row, items);
  },

  /** Payload completo para a tela da proposta e para o PDF. */
  async getForDocument(userId: number, id: number) {
    const row = await quoteRepository.findById(userId, id);
    if (!row) throw AppError.notFound('Orcamento nao encontrado.');

    const [items, client, company, subscription] = await Promise.all([
      quoteRepository.items(userId, id),
      clientRepository.findById(userId, row.client_id),
      companyRepository.findByUserId(userId),
      subscriptionRepository.findCurrentByUserId(userId),
    ]);

    return {
      quote: toPublicQuote(row, items),
      client: client
        ? {
            id: client.id,
            name: client.name,
            phone: client.phone,
            whatsapp: client.whatsapp ?? client.phone,
            email: client.email,
            document: client.document,
            city: client.city,
            state: client.state,
          }
        : null,
      company: company
        ? {
            tradeName: company.trade_name,
            legalName: company.legal_name,
            document: company.document,
            phone: company.phone,
            whatsapp: company.whatsapp,
            email: company.email,
            logoUrl: company.logo_url,
            city: company.city,
            state: company.state,
            instagram: company.instagram,
            website: company.website,
          }
        : null,
      /** No plano Free o PDF sai com a marca Clyvo. */
      branding: {
        showClyvoBrand: !subscription || subscription.has_custom_pdf === 0,
        planCode: subscription?.plan_code ?? 'free',
      },
    };
  },

  async create(userId: number, input: CreateQuoteInput) {
    return withTransaction(async () => {
      await userRepository.lock(userId);
    await planLimitService.assertCanCreate(userId, 'propostas');

    const client = await clientRepository.findById(userId, input.clientId);
    if (!client) throw AppError.badRequest('Cliente nao encontrado.');

    if (input.opportunityId) {
      const opportunity = await opportunityRepository.findById(userId, input.opportunityId);
      if (!opportunity) throw AppError.badRequest('Oportunidade nao encontrada.');
      if (opportunity.client_id !== input.clientId) throw AppError.badRequest('Oportunidade pertence a outro cliente.');
    }

    await assertCatalogItems(userId, input.items);

    const settings = await settingsRepository.findByUserId(userId);
    const validUntil = input.validUntil ?? addDaysIso(settings?.quote_validity_days ?? 7);

    const totals = computeTotals(input.items, input.discountType ?? 'valor', input.discountAmount ?? 0);

    const quoteId = await withTransaction(async (connection) => {
      const number = await quoteRepository.nextNumber(connection, userId);

      const id = await quoteRepository.createInTransaction(connection, userId, {
        ...input,
        number,
        subtotal: totals.subtotal,
        total: totals.total,
        validUntil,
      });

      for (let index = 0; index < totals.items.length; index += 1) {
        await quoteRepository.insertItemInTransaction(connection, userId, id, totals.items[index], index);
      }

      return id;
    });

    await quoteRepository.addHistory(userId, quoteId, null, 'rascunho', 'Orcamento criado');

    if (input.opportunityId) {
      await opportunityRepository.setTotal(userId, input.opportunityId, totals.total);
    }

    return quoteService.getById(userId, quoteId);
    });
  },

  async update(userId: number, id: number, input: UpdateQuoteInput) {
    return withTransaction(async () => {
      await userRepository.lock(userId);
    const existing = await quoteRepository.findById(userId, id);
    if (!existing) throw AppError.notFound('Orcamento nao encontrado.');

    if (existing.status === 'aceito') {
      throw AppError.conflict('Esse orcamento ja foi aceito e nao pode mais ser alterado.');
    }

    await quoteRepository.updateDetails(userId, id, input);

    if (input.items || input.discountType !== undefined || input.discountAmount !== undefined) {
      const currentItems = input.items ?? (await quoteRepository.items(userId, id)).map(item => ({
        itemType: item.item_type, productId: item.product_id, serviceId: item.service_id,
        description: item.description, quantity: Number(item.quantity), unitPrice: Number(item.unit_price), discount: Number(item.discount),
      }));
      await assertCatalogItems(userId, currentItems);

      const totals = computeTotals(
        currentItems,
        input.discountType ?? existing.discount_type,
        input.discountAmount ?? Number(existing.discount_amount),
      );

      await withTransaction(async (connection) => {
        await quoteRepository.deleteItems(userId, id);
        for (let index = 0; index < totals.items.length; index += 1) {
          await quoteRepository.insertItemInTransaction(connection, userId, id, totals.items[index], index);
        }
      });

      await quoteRepository.updateTotals(userId, id, {
        subtotal: totals.subtotal,
        discountType: input.discountType ?? existing.discount_type,
        discountAmount: input.discountAmount ?? Number(existing.discount_amount),
        total: totals.total,
      });

      if (existing.opportunity_id) {
        await opportunityRepository.setTotal(userId, existing.opportunity_id, totals.total);
      }
    }

    return quoteService.getById(userId, id);
    });
  },

  /**
   * Muda o status da proposta e mantem a oportunidade em sincronia:
   * enviado -> proposta_enviada, aceito -> fechado, recusado -> perdido.
   */
  async changeStatus(userId: number, id: number, status: QuoteStatus, note?: string | null) {
    return withTransaction(async () => {
      await userRepository.lock(userId);
    const existing = await quoteRepository.findById(userId, id);
    if (!existing) throw AppError.notFound('Orcamento nao encontrado.');

    if (existing.status === status) return quoteService.getById(userId, id);

    await quoteRepository.updateStatus(userId, id, status);
    await quoteRepository.addHistory(userId, id, existing.status, status, note ?? null);

    if (existing.opportunity_id) {
      const mapping: Partial<Record<QuoteStatus, 'proposta_enviada' | 'fechado' | 'perdido'>> = {
        enviado: 'proposta_enviada',
        aceito: 'fechado',
        recusado: 'perdido',
      };
      const nextStatus = mapping[status];

      if (nextStatus) {
        const { opportunityService } = await import('./opportunity.service');
        await opportunityService.changeStatus(userId, existing.opportunity_id, {
          status: nextStatus,
          note: `Pela proposta #${String(existing.number).padStart(4, '0')}`,
          registerSale: nextStatus === 'fechado',
          amount: Number(existing.total),
        });
      }
    }

    await clientRepository.touchContact(userId, existing.client_id);
    return quoteService.getById(userId, id);
    });
  },

  /** Mensagem pronta do WhatsApp para enviar a proposta (Etapa 8). */
  async whatsappMessage(userId: number, id: number) {
    const row = await quoteRepository.findById(userId, id);
    if (!row) throw AppError.notFound('Orcamento nao encontrado.');

    const items = await quoteRepository.items(userId, id);
    const summary = buildItemsSummary(items.map((item) => ({ description: item.description, quantity: Number(item.quantity) })));

    const message = await whatsappService.build(userId, 'envio_orcamento', {
      clientName: row.client_name ?? 'cliente',
      quoteNumber: row.number,
      quoteTotal: Number(row.total),
      itemsSummary: summary,
      deliveryTime: row.delivery_time,
      warranty: row.warranty,
      paymentMethods: row.payment_methods,
      validDays: daysUntil(row.valid_until),
    });

    const phone = row.client_whatsapp ?? row.client_phone ?? null;

    return { message, link: whatsappService.link(phone, message), phone };
  },

  async remove(userId: number, id: number) {
    const affected = await quoteRepository.softDelete(userId, id);
    if (affected === 0) throw AppError.notFound('Orcamento nao encontrado.');
  },
};

/** Garante que produto/servico citado pertence ao usuario. */
async function assertCatalogItems(userId: number, items: QuoteItemInput[]): Promise<void> {
  for (const item of items) {
    if (item.itemType === 'produto' && item.productId) {
      const product = await catalogRepository.findProduct(userId, item.productId);
      if (!product) throw AppError.badRequest(`Produto do item "${item.description}" nao encontrado.`);
    }
    if (item.itemType === 'servico' && item.serviceId) {
      const service = await catalogRepository.findService(userId, item.serviceId);
      if (!service) throw AppError.badRequest(`Servico do item "${item.description}" nao encontrado.`);
    }
  }
}

function buildItemsSummary(items: Array<{ description: string; quantity: number }>): string {
  if (items.length === 0) return '';
  const first = items[0];
  const label = first.quantity > 1 ? `${first.quantity}x ${first.description}` : first.description;
  return items.length === 1 ? label : `${label} e mais ${items.length - 1} item(ns)`;
}

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  return diff > 0 ? diff : null;
}

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export type { QuoteRow };
