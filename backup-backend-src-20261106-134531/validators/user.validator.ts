import { z } from 'zod';

import { nameSchema, phoneSchema } from './common';

export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema,
    whatsapp: phoneSchema,
    avatarUrl: z.string().trim().url('Informe uma URL valida.').max(255).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  });

export const updateSettingsSchema = z
  .object({
    currency: z.string().trim().length(3).toUpperCase().optional(),
    locale: z.string().trim().max(10).optional(),
    timezone: z.string().trim().max(64).optional(),
    followUpDays: z.coerce.number().int().min(1).max(60).optional(),
    quoteValidityDays: z.coerce.number().int().min(1).max(365).optional(),
    defaultWarrantyDays: z.coerce.number().int().min(0).max(3650).nullable().optional(),
    notificationsEnabled: z.boolean().optional(),
    whatsappSignature: z.string().trim().max(255).nullable().optional(),
    theme: z.enum(['claro', 'escuro', 'sistema']).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
