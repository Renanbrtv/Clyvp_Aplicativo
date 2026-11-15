import { z } from 'zod';

import { MAIN_GOALS, SELLS_TYPES } from '../config/constants';
import { emailSchema, nameSchema, passwordSchema, phoneSchema } from './common';

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    passwordConfirmation: z.string().optional(),
    phone: phoneSchema,
    whatsapp: phoneSchema,
    companyName: z.string().trim().max(160).optional().nullable(),
  })
  .strict()
  .refine(
    (data) => data.passwordConfirmation === undefined || data.passwordConfirmation === data.password,
    { message: 'A confirmacao de senha nao confere.', path: ['passwordConfirmation'] },
  );

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string({ required_error: 'Informe a senha.' }).min(1, 'Informe a senha.'),
  })
  .strict();

export const refreshSchema = z
  .object({
    refreshToken: z.string({ required_error: 'Informe o refresh token.' }).min(20, 'Token invalido.'),
  })
  .strict();

export const logoutSchema = z
  .object({
    refreshToken: z.string().min(20, 'Token invalido.').optional(),
    allDevices: z.boolean().optional().default(false),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: 'Informe a senha atual.' }).min(1, 'Informe a senha atual.'),
    newPassword: passwordSchema,
    newPasswordConfirmation: z.string().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.newPasswordConfirmation === undefined ||
      data.newPasswordConfirmation === data.newPassword,
    { message: 'A confirmacao da nova senha nao confere.', path: ['newPasswordConfirmation'] },
  )
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'A nova senha deve ser diferente da atual.',
    path: ['newPassword'],
  });

export const forgotPasswordSchema = z.object({ email: emailSchema }).strict();

export const resetPasswordSchema = z
  .object({
    token: z.string({ required_error: 'Informe o token de recuperacao.' }).min(20, 'Token invalido.'),
    newPassword: passwordSchema,
    newPasswordConfirmation: z.string().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.newPasswordConfirmation === undefined ||
      data.newPasswordConfirmation === data.newPassword,
    { message: 'A confirmacao da nova senha nao confere.', path: ['newPasswordConfirmation'] },
  );

export const onboardingSchema = z
  .object({
    sellsType: z.enum(SELLS_TYPES, {
      errorMap: () => ({ message: `Escolha uma opcao valida: ${SELLS_TYPES.join(', ')}.` }),
    }),
    mainGoal: z.enum(MAIN_GOALS, {
      errorMap: () => ({ message: `Escolha uma opcao valida: ${MAIN_GOALS.join(', ')}.` }),
    }),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
