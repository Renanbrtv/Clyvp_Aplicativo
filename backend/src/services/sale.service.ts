import { clientRepository } from '../repositories/client.repository';
import { opportunityRepository } from '../repositories/opportunity.repository';
import { quoteRepository } from '../repositories/quote.repository';
import { saleRepository } from '../repositories/sale.repository';
import { AppError } from '../utils/app-error';
import { buildPagination, paginationMeta } from '../utils/pagination';
import type { CreateSaleInput } from '../validators/sale.validator';
import { toPublicSale } from './mappers2';

export const saleService = {
  async list(userId: number, options: { clientId?: number; month?: string; page?: number; perPage?: number }) {
    const pagination = buildPagination(options.page, options.perPage);

    let from: string | undefined;
    let to: string | undefined;

    if (options.month) {
      const [year, month] = options.month.split('-').map(Number);
      from = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 19).replace('T', ' ');
      to = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 19).replace('T', ' ');
    }

    const { rows, total } = await saleRepository.list(userId, {
      clientId: options.clientId,
      from,
      to,
      pagination,
    });

    return {
      sales: rows.map(toPublicSale),
      meta: paginationMeta(pagination, total),
      totalAmount: rows.reduce((sum, row) => sum + Number(row.amount), 0),
    };
  },

  async create(userId: number, input: CreateSaleInput) {
    const client = await clientRepository.findById(userId, input.clientId);
    if (!client) throw AppError.badRequest('Cliente nao encontrado.');

    if (input.opportunityId) {
      const opportunity = await opportunityRepository.findById(userId, input.opportunityId);
      if (!opportunity) throw AppError.badRequest('Oportunidade nao encontrada.');
    }

    if (input.quoteId) {
      const quote = await quoteRepository.findById(userId, input.quoteId);
      if (!quote) throw AppError.badRequest('Orcamento nao encontrado.');
    }

    const id = await saleRepository.create(userId, input);
    await clientRepository.addPurchase(userId, input.clientId, input.amount);

    const created = await saleRepository.findById(userId, id);
    if (!created) throw AppError.internal('Falha ao registrar a venda.');

    return toPublicSale(created);
  },

  async remove(userId: number, id: number) {
    const affected = await saleRepository.softDelete(userId, id);
    if (affected === 0) throw AppError.notFound('Venda nao encontrada.');
  },
};
