import { z } from 'zod';

export const createSaleSchema = z
  .object({
    clientId: z.coerce.number().int().positive(),
    opportunityId: z.coerce.number().int().positive().nullable().optional(),
    quoteId: z.coerce.number().int().positive().nullable().optional(),
    description: z.string().trim().max(255).nullable().optional(),
    amount: z.coerce.number().positive('O valor da venda deve ser maior que zero.').max(99999999),
    paymentMethod: z.string().trim().max(40).nullable().optional(),
    soldAt: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/, 'Use AAAA-MM-DD.')
      .nullable()
      .optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export const listSalesSchema = z
  .object({
    clientId: z.coerce.number().int().positive().optional(),
    month: z.string().trim().regex(/^\d{4}-\d{2}$/).optional(),
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
  })
  .passthrough();

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
