import { z } from 'zod';

export const generateProposalSchema = z
  .object({
    prompt: z.string().trim().min(10, 'Descreva o que o cliente precisa.').max(2000),
    clientId: z.coerce.number().int().positive().nullable().optional(),
  })
  .strict();

export const generateMessageSchema = z
  .object({
    kind: z.enum([
      'primeiro_contato',
      'envio_orcamento',
      'negociacao',
      'follow_up',
      'recuperacao',
      'pos_venda',
    ]),
    clientId: z.coerce.number().int().positive().nullable().optional(),
    opportunityId: z.coerce.number().int().positive().nullable().optional(),
    quoteId: z.coerce.number().int().positive().nullable().optional(),
    extra: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export const improveTextSchema = z
  .object({
    text: z.string().trim().min(2, 'Escreva algo para melhorar.').max(1000),
  })
  .strict();
