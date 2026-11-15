import { z } from 'zod';

import { OPPORTUNITY_STATUSES } from '../config/constants';
import { nameSchema, phoneSchema } from './common';

const money = z.coerce.number().min(0).max(99999999);
const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
  .nullable()
  .optional();

/** Cliente novo criado junto com a oportunidade (fluxo rapido da tela). */
const newClientSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  whatsapp: phoneSchema,
});

export const createOpportunitySchema = z
  .object({
    clientId: z.coerce.number().int().positive().optional(),
    newClient: newClientSchema.optional(),
    title: z.string().trim().min(2, 'Informe o titulo.').max(160),
    description: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(OPPORTUNITY_STATUSES).optional(),
    source: z.string().trim().max(60).nullable().optional(),
    totalAmount: money.optional(),
    expectedCloseDate: dateOnly,
  })
  .strict()
  .refine((data) => data.clientId !== undefined || data.newClient !== undefined, {
    message: 'Escolha um cliente existente ou informe os dados de um novo.',
    path: ['clientId'],
  });

export const updateOpportunitySchema = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    source: z.string().trim().max(60).nullable().optional(),
    totalAmount: money.optional(),
    expectedCloseDate: dateOnly,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'Informe ao menos um campo.' });

export const changeStatusSchema = z
  .object({
    status: z.enum(OPPORTUNITY_STATUSES),
    note: z.string().trim().max(255).nullable().optional(),
    lostReason: z.string().trim().max(255).nullable().optional(),
    /** Ao marcar como fechado, registra a venda automaticamente. */
    registerSale: z.boolean().optional(),
    amount: money.optional(),
    paymentMethod: z.string().trim().max(40).nullable().optional(),
  })
  .strict();

export const listOpportunitiesSchema = z
  .object({
    status: z.enum(OPPORTUNITY_STATUSES).optional(),
    clientId: z.coerce.number().int().positive().optional(),
    search: z.string().trim().max(120).optional(),
    open: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
  })
  .passthrough();

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
