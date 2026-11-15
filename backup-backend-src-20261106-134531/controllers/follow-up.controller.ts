import type { Request, Response } from 'express';

import { requireUser } from '../middleware/authenticate';
import { followUpService } from '../services/follow-up.service';
import { sendCreated, sendSuccess } from '../utils/http';

export const followUpController = {
  async agenda(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await followUpService.agenda(user.id);
    return sendSuccess(res, data);
  },

  async list(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await followUpService.list(
      user.id,
      (req.query.period as never) ?? 'todos',
      req.query.limit ? Number(req.query.limit) : undefined,
    );
    return sendSuccess(res, data);
  },

  async create(req: Request, res: Response) {
    const user = requireUser(req);
    const followUp = await followUpService.create(user.id, req.body as never);
    return sendCreated(res, { followUp }, 'Lembrete criado.');
  },

  async updateStatus(req: Request, res: Response) {
    const user = requireUser(req);
    const { status, snoozedUntil } = req.body as { status: never; snoozedUntil?: string | null };
    const followUp = await followUpService.updateStatus(user.id, Number(req.params.id), status, snoozedUntil);
    return sendSuccess(res, { followUp }, { message: 'Follow-up atualizado.' });
  },

  async message(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await followUpService.message(user.id, Number(req.params.id));
    return sendSuccess(res, data);
  },

  async remove(req: Request, res: Response) {
    const user = requireUser(req);
    await followUpService.remove(user.id, Number(req.params.id));
    return sendSuccess(res, null, { message: 'Lembrete excluido.' });
  },

  /** Clientes que precisam de atencao, com a mensagem de retomada pronta. */
  async recovery(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await followUpService.recovery(user.id);
    return sendSuccess(res, data);
  },
};
