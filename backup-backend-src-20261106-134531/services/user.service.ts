import { withTransaction } from '../config/database';
import { exportRepository } from '../repositories/export.repository';
import { companyRepository } from '../repositories/company.repository';
import { settingsRepository } from '../repositories/settings.repository';
import { subscriptionRepository } from '../repositories/subscription.repository';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/app-error';
import type { UpdateProfileInput, UpdateSettingsInput } from '../validators/user.validator';
import {
  toPublicCompany,
  toPublicSettings,
  toPublicSubscription,
  toPublicUser,
} from './mappers';

export const userService = {
  /** Payload completo consumido pelo app logo apos o login. */
  async getAccount(userId: number) {
    const [user, company, settings, subscription] = await Promise.all([
      userRepository.findById(userId),
      companyRepository.findByUserId(userId),
      settingsRepository.findByUserId(userId),
      subscriptionRepository.findCurrentByUserId(userId),
    ]);

    if (!user) {
      throw AppError.notFound('Conta nao encontrada.');
    }

    return {
      user: toPublicUser(user),
      company: company ? toPublicCompany(company) : null,
      settings: settings ? toPublicSettings(settings) : null,
      subscription: subscription ? toPublicSubscription(subscription) : null,
    };
  },

  async getProfile(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('Conta nao encontrada.');
    }
    return toPublicUser(user);
  },

  async updateProfile(userId: number, input: UpdateProfileInput) {
    await userRepository.updateProfile(userId, input);
    return userService.getProfile(userId);
  },

  async getSettings(userId: number) {
    const settings = await settingsRepository.findByUserId(userId);
    if (!settings) {
      throw AppError.notFound('Preferencias nao encontradas.');
    }
    return toPublicSettings(settings);
  },

  async updateSettings(userId: number, input: UpdateSettingsInput) {
    await settingsRepository.update(userId, input);
    return userService.getSettings(userId);
  },

  async exportData(userId: number) {
    return withTransaction(async () => ({
      app: 'Clyvo', formatVersion: 1, exportedAt: new Date().toISOString(),
      user: await userService.getProfile(userId),
      data: await exportRepository.all(userId),
    }));
  },

  /** Exclusao de conta (LGPD): remove o acesso e encerra as sessoes. */
  async deleteAccount(userId: number) {
    await userRepository.deletePermanently(userId);
  },
};
