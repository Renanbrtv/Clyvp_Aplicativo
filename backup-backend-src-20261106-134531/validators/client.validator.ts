import { z } from 'zod';

import { nameSchema, phoneSchema } from './common';

const documentSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ''))
  .refine(
    (value) => value.length === 0 || value.length === 11 || value.length === 14,
    'Informe um CPF (11 digitos) ou CNPJ (14 digitos).',
  )
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

const zipCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => value.length === 0 || value.length === 8, 'CEP deve ter 8 digitos.')
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

const baseClient = {
  name: nameSchema,
  phone: phoneSchema,
  whatsapp: phoneSchema,
  email: z.string().trim().toLowerCase().email('Informe um e-mail valido.').max(160).nullable().optional(),
  document: documentSchema,
  zipCode: zipCodeSchema,
  street: z.string().trim().max(160).nullable().optional(),
  number: z.string().trim().max(20).nullable().optional(),
  complement: z.string().trim().max(120).nullable().optional(),
  district: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  state: z.string().trim().toUpperCase().length(2, 'Use a sigla com 2 letras.').nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  origin: z.string().trim().max(60).nullable().optional(),
};

export const createClientSchema = z.object(baseClient).strict();

export const updateClientSchema = z
  .object({ ...baseClient, name: nameSchema.optional() })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'Informe ao menos um campo.' });

export const listClientsSchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    filter: z.enum(['todos', 'recentes', 'recorrentes', 'sem_contato', 'alto_valor']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
  })
  .passthrough();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
