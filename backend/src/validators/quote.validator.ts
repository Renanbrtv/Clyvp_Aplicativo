import { z } from 'zod';

import { QUOTE_STATUSES, QUOTE_TYPES } from '../config/constants';

const money = z.coerce.number().min(0).max(99999999);

const quoteItemSchema = z
  .object({
    itemType: z.enum(['produto', 'servico', 'avulso']),
    productId: z.coerce.number().int().positive().nullable().optional(),
    serviceId: z.coerce.number().int().positive().nullable().optional(),
    description: z.string().trim().min(1, 'Descreva o item.').max(255),
    quantity: z.coerce.number().positive('A quantidade deve ser maior que zero.').max(99999),
    unitPrice: money,
    discount: money.optional(),
  })
  .strict();

const baseQuote = {
  clientId: z.coerce.number().int().positive(),
  opportunityId: z.coerce.number().int().positive().nullable().optional(),
  type: z.enum(QUOTE_TYPES),
  discountType: z.enum(['valor', 'percentual']).optional(),
  discountAmount: money.optional(),
  deliveryTime: z.string().trim().max(80).nullable().optional(),
  warranty: z.string().trim().max(80).nullable().optional(),
  paymentMethods: z.string().trim().max(160).nullable().optional(),
  validUntil: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
    .nullable()
    .optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
};

export const createQuoteSchema = z
  .object({
    ...baseQuote,
    items: z.array(quoteItemSchema).min(1, 'Adicione ao menos um item.').max(50),
  })
  .strict();

export const updateQuoteSchema = z
  .object({
    ...baseQuote,
    clientId: z.never().optional(),
    opportunityId: z.never().optional(),
    type: z.enum(QUOTE_TYPES).optional(),
    items: z.array(quoteItemSchema).min(1).max(50).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'Informe ao menos um campo.' });

export const changeQuoteStatusSchema = z
  .object({
    status: z.enum(QUOTE_STATUSES),
    note: z.string().trim().max(255).nullable().optional(),
  })
  .strict();

export const listQuotesSchema = z
  .object({
    status: z.enum(QUOTE_STATUSES).optional(),
    type: z.enum(QUOTE_TYPES).optional(),
    clientId: z.coerce.number().int().positive().optional(),
    opportunityId: z.coerce.number().int().positive().optional(),
    pending: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
  })
  .passthrough();

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type QuoteItemPayload = z.infer<typeof quoteItemSchema>;
