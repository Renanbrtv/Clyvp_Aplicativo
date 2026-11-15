import { z } from 'zod';

/** Remove espacos das pontas e converte string vazia em null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no maximo ${max} caracteres.`)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

export const emailSchema = z
  .string({ required_error: 'Informe o e-mail.' })
  .trim()
  .toLowerCase()
  .min(5, 'E-mail muito curto.')
  .max(160, 'E-mail muito longo.')
  .email('Informe um e-mail valido.');

/**
 * Senha forte o suficiente sem ser irritante:
 * minimo 8 caracteres, com pelo menos uma letra e um numero.
 */
export const passwordSchema = z
  .string({ required_error: 'Informe a senha.' })
  .min(8, 'A senha deve ter no minimo 8 caracteres.')
  .max(72, 'A senha deve ter no maximo 72 caracteres.')
  .refine((value) => /[A-Za-zÀ-ÿ]/.test(value), 'A senha deve conter pelo menos uma letra.')
  .refine((value) => /\d/.test(value), 'A senha deve conter pelo menos um numero.');

/** Telefone brasileiro: aceita mascara e guarda somente digitos. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ''))
  .refine(
    (value) => value.length === 0 || (value.length >= 10 && value.length <= 13),
    'Informe um telefone valido com DDD.',
  )
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

export const nameSchema = z
  .string({ required_error: 'Informe o nome.' })
  .trim()
  .min(2, 'O nome deve ter no minimo 2 caracteres.')
  .max(120, 'O nome deve ter no maximo 120 caracteres.');

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('Identificador invalido.'),
});
