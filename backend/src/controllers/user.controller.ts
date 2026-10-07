import type { Request, Response } from 'express';

import { requireUser } from '../middleware/authenticate';
import { userService } from '../services/user.service';
import { sendSuccess } from '../utils/http';
import type { UpdateProfileInput, UpdateSettingsInput } from '../validators/user.validator';

export const userController = {
  /** GET /api/users/me */
  async getProfile(req: Request, res: Response) {
    const user = requireUser(req);
    const profile = await userService.getProfile(user.id);
    return sendSuccess(res, { user: profile });
  },

  /** PATCH /api/users/me */
  async updateProfile(req: Request, res: Response) {
    const user = requireUser(req);
    const profile = await userService.updateProfile(user.id, req.body as UpdateProfileInput);
    return sendSuccess(res, { user: profile }, { message: 'Perfil atualizado.' });
  },

  /** GET /api/users/me/settings */
  async getSettings(req: Request, res: Response) {
    const user = requireUser(req);
    const settings = await userService.getSettings(user.id);
    return sendSuccess(res, { settings });
  },

  /** PATCH /api/users/me/settings */
  async updateSettings(req: Request, res: Response) {
    const user = requireUser(req);
    const settings = await userService.updateSettings(user.id, req.body as UpdateSettingsInput);
    return sendSuccess(res, { settings }, { message: 'Preferencias atualizadas.' });
  },

  async exportData(req: Request, res: Response) {
    return sendSuccess(res, await userService.exportData(requireUser(req).id));
  },

  /** DELETE /api/users/me */
  async deleteAccount(req: Request, res: Response) {
    const user = requireUser(req);
    await userService.deleteAccount(user.id);
    return sendSuccess(res, null, { message: 'Conta e dados excluidos.' });
  },
};
