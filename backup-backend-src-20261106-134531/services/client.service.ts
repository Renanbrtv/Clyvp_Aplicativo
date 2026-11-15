import { userRepository } from '../repositories/user.repository';
import { withTransaction } from '../config/database';
import { clientRepository, type ClientFilter } from '../repositories/client.repository';
import { opportunityRepository } from '../repositories/opportunity.repository';
import { quoteRepository } from '../repositories/quote.repository';
import { saleRepository } from '../repositories/sale.repository';
import { settingsRepository } from '../repositories/settings.repository';
import type { ClientRow } from '../types/models2';
import { AppError } from '../utils/app-error';
import { buildPagination, paginationMeta } from '../utils/pagination';
import type { CreateClientInput, UpdateClientInput } from '../validators/client.validator';
import { planLimitService } from './plan-limit.service';
import { toPublicOpportunity, toPublicQuote, toPublicSale } from './mappers2';

export function toPublicClient(row: ClientRow) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    whatsapp: row.whatsapp ?? row.phone,
    email: row.email,
    document: row.document,
    address: {
      zipCode: row.zip_code,
      street: row.street,
      number: row.number,
      complement: row.complement,
      district: row.district,
      city: row.city,
      state: row.state,
    },
    notes: row.notes,
    origin: row.origin,
    totalPurchased: Number(row.total_purchased),
    purchasesCount: row.purchases_count,
    lastContactAt: row.last_contact_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const clientService = {
  async list(
    userId: number,
    options: { search?: string; filter?: ClientFilter; page?: number; perPage?: number },
  ) {
    const settings = await settingsRepository.findByUserId(userId);
    const pagination = buildPagination(options.page, options.perPage);

    const { rows, total } = await clientRepository.list(userId, {
      search: options.search,
      filter: options.filter,
      followUpDays: settings?.follow_up_days ?? 3,
      pagination,
    });

    return { clients: rows.map(toPublicClient), meta: paginationMeta(pagination, total) };
  },

  async getById(userId: number, id: number) {
    const client = await clientRepository.findById(userId, id);
    if (!client) throw AppError.notFound('Cliente nao encontrado.');
    return toPublicClient(client);
  },

  /** Detalhe com o historico completo - usado na tela do cliente. */
  async getDetail(userId: number, id: number) {
    const client = await clientRepository.findById(userId, id);
    if (!client) throw AppError.notFound('Cliente nao encontrado.');

    const pagination = buildPagination(1, 50);

    const [opportunities, quotes, sales] = await Promise.all([
      opportunityRepository.list(userId, { clientId: id, pagination }),
      quoteRepository.list(userId, { clientId: id, pagination }),
      saleRepository.list(userId, { clientId: id, pagination }),
    ]);

    return {
      client: toPublicClient(client),
      opportunities: opportunities.rows.map(toPublicOpportunity),
      quotes: quotes.rows.map((quote) => toPublicQuote(quote)),
      sales: sales.rows.map(toPublicSale),
    };
  },

  async create(userId: number, input: CreateClientInput) {
    return withTransaction(async () => {
      await userRepository.lock(userId);
    await planLimitService.assertCanCreate(userId, 'clientes');

    const id = await clientRepository.create(userId, {
      ...input,
      whatsapp: input.whatsapp ?? input.phone ?? null,
    });

    return clientService.getById(userId, id);
    });
  },

  async update(userId: number, id: number, input: UpdateClientInput) {
    const existing = await clientRepository.findById(userId, id);
    if (!existing) throw AppError.notFound('Cliente nao encontrado.');

    await clientRepository.update(userId, id, input);
    return clientService.getById(userId, id);
  },

  async remove(userId: number, id: number) {
    const affected = await clientRepository.softDelete(userId, id);
    if (affected === 0) throw AppError.notFound('Cliente nao encontrado.');
  },

  async registerContact(userId: number, id: number) {
    const existing = await clientRepository.findById(userId, id);
    if (!existing) throw AppError.notFound('Cliente nao encontrado.');

    await clientRepository.touchContact(userId, id);
    return clientService.getById(userId, id);
  },
};
