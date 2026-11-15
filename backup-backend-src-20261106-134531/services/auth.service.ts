import { execute, queryOne, type RowDataPacket, withTransaction } from '../config/database';
import { env } from '../config/env';
import { companyRepository } from '../repositories/company.repository';
import { passwordResetRepository } from '../repositories/password-reset.repository';
import { planRepository } from '../repositories/plan.repository';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';
import { settingsRepository } from '../repositories/settings.repository';
import { subscriptionRepository } from '../repositories/subscription.repository';
import { userRepository } from '../repositories/user.repository';
import type { TokenPair } from '../types/auth';
import type { PublicUser } from '../types/models';
import { AppError } from '../utils/app-error';
import { generateOpaqueToken, generateTokenId, hashToken } from '../utils/crypto';
import { addMinutes } from '../utils/dates';
import {
  expiresInSeconds,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { logger } from '../utils/logger';
import { fakePasswordCheck, hashPassword, verifyPassword } from '../utils/password';
import type {
  ChangePasswordInput,
  LoginInput,
  OnboardingInput,
  RegisterInput,
  ResetPasswordInput,
} from '../validators/auth.validator';
import { toPublicUser } from './mappers';
import { emailService } from './email.service';

interface SessionContext {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface AuthResult {
  user: PublicUser;
  tokens: TokenPair;
}

export const authService = {
  /**
   * Cadastro.
   *
   * Tudo acontece dentro de UMA transacao: usuario + empresa + preferencias +
   * assinatura Free. Se qualquer passo falhar, nada e gravado.
   */
  async register(input: RegisterInput, context: SessionContext): Promise<AuthResult> {
    const emailAlreadyUsed = await userRepository.emailExists(input.email);
    if (emailAlreadyUsed) {
      throw AppError.conflict('Ja existe uma conta com este e-mail.', 'EMAIL_ALREADY_EXISTS');
    }

    const freePlan = await planRepository.findByCode('free');
    if (!freePlan) {
      logger.error('Plano "free" nao encontrado. Execute npm run db:migrate.');
      throw AppError.internal('Planos nao configurados. Rode as migrations do banco.');
    }

    const passwordHash = await hashPassword(input.password);

    const userId = await withTransaction(async (connection) => {
      const createdUserId = await userRepository.createInTransaction(connection, {
        name: input.name,
        email: input.email,
        passwordHash,
        phone: input.phone ?? null,
        whatsapp: input.whatsapp ?? input.phone ?? null,
      });

      await companyRepository.createInTransaction(
        connection,
        createdUserId,
        input.companyName?.trim() || input.name,
      );
      await settingsRepository.createInTransaction(connection, createdUserId);
      await subscriptionRepository.createInTransaction(connection, createdUserId, freePlan.id, 'ativa', {
        pricePaid: 0,
      });

      return createdUserId;
    });

    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.internal('Falha ao carregar a conta recem-criada.');
    }

    const tokens = await issueTokens(user.id, user.email, context);
    logger.info(`Nova conta criada: ${user.email} (id ${user.id})`);

    return { user: toPublicUser(user), tokens };
  },

  /** Login com e-mail e senha. */
  async login(input: LoginInput, context: SessionContext): Promise<AuthResult> {
    const user = await userRepository.findByEmail(input.email);

    if (!user) {
      // Mantem o tempo de resposta parecido com o de um e-mail existente.
      await fakePasswordCheck();
      throw AppError.unauthorized('E-mail ou senha incorretos.', 'INVALID_CREDENTIALS');
    }

    const passwordMatches = await verifyPassword(input.password, user.password_hash);
    if (!passwordMatches) {
      throw AppError.unauthorized('E-mail ou senha incorretos.', 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'ativo') {
      throw AppError.forbidden('Esta conta esta inativa ou bloqueada.', 'USER_NOT_ACTIVE');
    }

    const tokens = await withTransaction(async () => {
      await userRepository.lock(user.id);
      const current = await userRepository.findById(user.id);
      if (!current || current.status !== 'ativo' || current.password_hash !== user.password_hash) {
        throw AppError.unauthorized('Credenciais alteradas. Entre novamente.', 'INVALID_CREDENTIALS');
      }
      await userRepository.touchLastLogin(user.id);
      return issueTokens(user.id, user.email, context);
    });

    return { user: toPublicUser(user), tokens };
  },

  /**
   * Renova o par de tokens (rotacao).
   * O refresh token usado e revogado imediatamente - reuso nao funciona.
   */
  async refresh(refreshToken: string, context: SessionContext): Promise<AuthResult> {
    const payload = verifyRefreshToken(refreshToken);
    return withTransaction(async () => {
    await userRepository.lock(Number(payload.sub));
    const stored = await refreshTokenRepository.findValidByTokenId(payload.jti);

    if (!stored || stored.token_hash !== hashToken(refreshToken)) {
      throw AppError.unauthorized('Sessao invalida. Faca login novamente.', 'INVALID_REFRESH_TOKEN');
    }

    const user = await userRepository.findById(Number(payload.sub));
    if (!user || user.status !== 'ativo') {
      throw AppError.unauthorized('Conta indisponivel.', 'USER_NOT_ACTIVE');
    }

    const consumed = await refreshTokenRepository.revokeByTokenId(payload.jti);
    if (consumed !== 1) throw AppError.unauthorized('Sessao ja renovada. Entre novamente.', 'INVALID_REFRESH_TOKEN');
    const tokens = await issueTokens(user.id, user.email, context);

    return { user: toPublicUser(user), tokens };
    });
  },

  /** Logout: revoga a sessao atual ou todas as sessoes do usuario. */
  async logout(
    userId: number,
    options: { refreshToken?: string; allDevices?: boolean },
  ): Promise<{ revokedSessions: number }> {
    if (options.allDevices) {
      const revoked = await refreshTokenRepository.revokeAllForUser(userId);
      return { revokedSessions: revoked };
    }

    if (!options.refreshToken) {
      return { revokedSessions: 0 };
    }

    try {
      const payload = verifyRefreshToken(options.refreshToken);
      if (Number(payload.sub) !== userId) {
        throw AppError.forbidden('Este token pertence a outra conta.');
      }
      const revoked = await refreshTokenRepository.revokeByTokenId(payload.jti);
      return { revokedSessions: revoked };
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 403) throw error;
      // Token ja expirado/invalido: logout e idempotente.
      return { revokedSessions: 0 };
    }
  },

  /** Troca de senha por quem ja esta logado. */
  async changePassword(userId: number, input: ChangePasswordInput): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('Conta nao encontrada.');
    }

    const currentMatches = await verifyPassword(input.currentPassword, user.password_hash);
    if (!currentMatches) {
      throw AppError.unauthorized('A senha atual esta incorreta.', 'INVALID_CURRENT_PASSWORD');
    }

    const passwordHash = await hashPassword(input.newPassword);
    await withTransaction(async () => {
    await userRepository.lock(userId);
    const current = await userRepository.findById(userId);
    if (!current || current.password_hash !== user.password_hash) throw AppError.unauthorized('Senha alterada. Entre novamente.');
    await userRepository.updatePassword(userId, passwordHash);

    // Por seguranca, todas as sessoes sao encerradas.
    await refreshTokenRepository.revokeAllForUser(userId);
    await execute('INSERT INTO session_security (user_id, version) VALUES (?, 1) ON DUPLICATE KEY UPDATE version=version+1', [userId]);
    });
    logger.info(`Senha alterada para o usuario ${userId}. Sessoes revogadas.`);
  },

  /**
   * Solicitacao de recuperacao de senha.
   *
   * A resposta e sempre a mesma, exista ou nao a conta (evita descobrir
   * quais e-mails estao cadastrados). O envio usa Resend quando configurado. Em ambiente de
   * desenvolvimento o token e devolvido para permitir o teste ponta a ponta.
   */
  async forgotPassword(email: string): Promise<{ devToken?: string }> {
    if (env.isProduction && !emailService.configured) {
      throw new AppError('Recuperacao de senha indisponivel temporariamente.', 503, 'EMAIL_UNAVAILABLE');
    }
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return {};
    }

    await passwordResetRepository.invalidateAllForUser(user.id);

    const token = generateOpaqueToken();
    const expiresAt = addMinutes(new Date(), env.PASSWORD_RESET_EXPIRES_MINUTES);
    await passwordResetRepository.create(user.id, hashToken(token), expiresAt);

    logger.info(`Token de recuperacao gerado para o usuario ${user.id}.`);

    if (emailService.configured) {
      try { await emailService.sendPasswordReset(user.email, token); }
      catch (error) {
        await passwordResetRepository.invalidateAllForUser(user.id);
        logger.error('Falha no envio de recuperacao de senha.');
        // Resposta identica para contas existentes e inexistentes.
        return {};
      }
      return {};
    }
    return env.isDevelopment ? { devToken: token } : {};
  },

  /** Conclui a recuperacao de senha usando o token recebido. */
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await withTransaction(async () => {
    const candidate = await passwordResetRepository.findValidByHash(hashToken(input.token));
    if (!candidate) throw AppError.badRequest('Token de recuperacao invalido ou expirado.', 'INVALID_RESET_TOKEN');
    await userRepository.lock(candidate.user_id);
    const stored = await passwordResetRepository.findValidByHash(hashToken(input.token), true);
    if (!stored) {
      throw AppError.badRequest('Token de recuperacao invalido ou expirado.', 'INVALID_RESET_TOKEN');
    }

    const passwordHash = await hashPassword(input.newPassword);
    await userRepository.updatePassword(stored.user_id, passwordHash);
    await passwordResetRepository.markAsUsed(stored.id);
    await refreshTokenRepository.revokeAllForUser(stored.user_id);
    await execute('INSERT INTO session_security (user_id, version) VALUES (?, 1) ON DUPLICATE KEY UPDATE version=version+1', [stored.user_id]);

    logger.info(`Senha redefinida para o usuario ${stored.user_id}.`);
    });
  },

  /** Salva as respostas do onboarding (personalizam o dashboard). */
  async completeOnboarding(userId: number, input: OnboardingInput): Promise<PublicUser> {
    await userRepository.completeOnboarding(userId, {
      sellsType: input.sellsType,
      mainGoal: input.mainGoal,
    });

    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('Conta nao encontrada.');
    }

    return toPublicUser(user);
  },
};

/** Gera access token + refresh token e registra a sessao no banco. */
async function issueTokens(
  userId: number,
  email: string,
  context: SessionContext,
): Promise<TokenPair> {
  const tokenId = generateTokenId();
  const security = await queryOne<RowDataPacket>('SELECT version FROM session_security WHERE user_id=?', [userId]);
  const accessToken = signAccessToken(userId, email, Number(security?.version ?? 0));
  const refreshToken = signRefreshToken(userId, tokenId);

  const refreshLifetimeSeconds = expiresInSeconds(env.JWT_REFRESH_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + refreshLifetimeSeconds * 1000);

  await refreshTokenRepository.create({
    userId,
    tokenId,
    tokenHash: hashToken(refreshToken),
    expiresAt,
    userAgent: context.userAgent ?? null,
    ipAddress: context.ipAddress ?? null,
  });

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: expiresInSeconds(env.JWT_ACCESS_EXPIRES_IN),
  };
}
