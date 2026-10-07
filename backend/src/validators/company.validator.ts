import { z } from 'zod';

import { phoneSchema } from './common';

/** CPF (11) ou CNPJ (14) - guardamos apenas digitos. */
const documentSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ''))
  .refine(
    (value) => value.length === 0 || value.length === 11 || value.length === 14,
    'Informe um CPF (11 digitos) ou CNPJ (14 digitos) valido.',
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

export const updateCompanySchema = z
  .object({
    legalName: z.string().trim().max(160).nullable().optional(),
    tradeName: z.string().trim().max(160).nullable().optional(),
    document: documentSchema,
    phone: phoneSchema,
    whatsapp: phoneSchema,
    email: z.string().trim().toLowerCase().email('Informe um e-mail valido.').max(160).nullable().optional(),
    logoUrl: z.string().trim().url('Informe uma URL valida.').max(255).nullable().optional(),
    zipCode: zipCodeSchema,
    street: z.string().trim().max(160).nullable().optional(),
    number: z.string().trim().max(20).nullable().optional(),
    complement: z.string().trim().max(120).nullable().optional(),
    district: z.string().trim().max(120).nullable().optional(),
    city: z.string().trim().max(120).nullable().optional(),
    state: z
      .string()
      .trim()
      .toUpperCase()
      .length(2, 'Use a sigla do estado com 2 letras.')
      .nullable()
      .optional(),
    instagram: z.string().trim().max(120).nullable().optional(),
    website: z.string().trim().max(160).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  });

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
