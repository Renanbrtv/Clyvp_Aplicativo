import { z } from 'zod';

import { FOLLOW_UP_STATUSES } from '../config/constants';

const dateOnly = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.');

export const createFollowUpSchema = z
  .object({
    clientId: z.coerce.number().int().positive().nullable().optional(),
    opportunityId: z.coerce.number().int().positive().nullable().optional(),
    quoteId: z.coerce.number().int().positive().nullable().optional(),
    type: z.enum(['contato', 'retorno', 'recuperacao', 'pos_venda', 'garantia', 'outro']),
    title: z.string().trim().min(2, 'Informe o titulo.').max(160),
    notes: z.string().trim().max(2000).nullable().optional(),
    dueDate: dateOnly,
  })
  .strict();

export const updateFollowUpStatusSchema = z
  .object({
    status: z.enum(FOLLOW_UP_STATUSES),
    /** Obrigatorio quando o status e "adiado". */
    snoozedUntil: dateOnly.nullable().optional(),
  })
  .strict()
  .refine((data) => data.status !== 'adiado' || Boolean(data.snoozedUntil), {
    message: 'Informe para qual data deseja adiar.',
    path: ['snoozedUntil'],
  });

export const listFollowUpsSchema = z
  .object({
    period: z.enum(['hoje', 'amanha', 'semana', 'atrasados', 'todos']).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .passthrough();
