import type { Request, Response } from 'express';

import { requireUser } from '../middleware/authenticate';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { clientIp, clientUserAgent, sendCreated, sendSuccess } from '../utils/http';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  OnboardingInput,
  RefreshInput,
  RegisterInput,
  ResetPasswordInput,
} from '../validators/auth.validator';

export const authController = {
  /** POST /api/auth/register */
  async register(req: Request, res: Response) {
    const input = req.body as RegisterInput;
    const result = await authService.register(input, {
      userAgent: clientUserAgent(req),
      ipAddress: clientIp(req),
    });

    return sendCreated(res, result, 'Conta criada com sucesso. Bem-vindo ao Clyvo!');
  },

  /** POST /api/auth/login */
  async login(req: Request, res: Response) {
    const input = req.body as LoginInput;
    const result = await authService.login(input, {
      userAgent: clientUserAgent(req),
      ipAddress: clientIp(req),
    });

    return sendSuccess(res, result, { message: 'Login realizado com sucesso.' });
  },

  /** POST /api/auth/refresh */
  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body as RefreshInput;
    const result = await authService.refresh(refreshToken, {
      userAgent: clientUserAgent(req),
      ipAddress: clientIp(req),
    });

    return sendSuccess(res, result, { message: 'Sessao renovada.' });
  },

  /** POST /api/auth/logout (autenticada) */
  async logout(req: Request, res: Response) {
    const user = requireUser(req);
    const input = (req.body ?? {}) as LogoutInput;

    const result = await authService.logout(user.id, {
      refreshToken: input.refreshToken,
      allDevices: input.allDevices,
    });

    return sendSuccess(res, result, { message: 'Sessao encerrada.' });
  },

  /** GET /api/auth/me (autenticada) */
  async me(req: Request, res: Response) {
    const user = requireUser(req);
    const account = await userService.getAccount(user.id);
    return sendSuccess(res, account);
  },

  /** POST /api/auth/change-password (autenticada) */
  async changePassword(req: Request, res: Response) {
    const user = requireUser(req);
    await authService.changePassword(user.id, req.body as ChangePasswordInput);

    return sendSuccess(res, null, {
      message: 'Senha alterada com sucesso. Faca login novamente.',
    });
  },

  /** POST /api/auth/forgot-password */
  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body as ForgotPasswordInput;
    const result = await authService.forgotPassword(email);

    // Resposta identica exista ou nao a conta.
    return sendSuccess(res, result, {
      message: 'Se existir uma conta com este e-mail, enviaremos as instrucoes de recuperacao.',
    });
  },

  /** POST /api/auth/reset-password */
  async resetPassword(req: Request, res: Response) {
    await authService.resetPassword(req.body as ResetPasswordInput);

    return sendSuccess(res, null, {
      message: 'Senha redefinida com sucesso. Faca login com a nova senha.',
    });
  },

  /** POST /api/auth/onboarding (autenticada) */
  async onboarding(req: Request, res: Response) {
    const user = requireUser(req);
    const updated = await authService.completeOnboarding(user.id, req.body as OnboardingInput);

    return sendSuccess(res, { user: updated }, { message: 'Tudo pronto! Seu Clyvo esta configurado.' });
  },
};
