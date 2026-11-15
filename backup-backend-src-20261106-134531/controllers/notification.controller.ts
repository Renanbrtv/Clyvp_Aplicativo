import type { Request, Response } from 'express';

import { requireUser } from '../middleware/authenticate';
import { notificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/http';

export const notificationController = {
  async list(req: Request, res: Response) {
    const user = requireUser(req);
    const onlyUnread = req.query.unread === 'true' || req.query.unread === '1';
    const data = await notificationService.list(user.id, onlyUnread);
    return sendSuccess(res, data);
  },

  /** Recalcula os avisos a partir do estado atual do banco. */
  async refresh(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await notificationService.refresh(user.id);
    return sendSuccess(res, data);
  },

  async markAsRead(req: Request, res: Response) {
    const user = requireUser(req);
    await notificationService.markAsRead(user.id, Number(req.params.id));
    return sendSuccess(res, null, { message: 'Notificacao lida.' });
  },

  async markAllAsRead(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await notificationService.markAllAsRead(user.id);
    return sendSuccess(res, data, { message: 'Tudo marcado como lido.' });
  },

  async remove(req: Request, res: Response) {
    const user = requireUser(req);
    await notificationService.remove(user.id, Number(req.params.id));
    return sendSuccess(res, null, { message: 'Notificacao removida.' });
  },
};
