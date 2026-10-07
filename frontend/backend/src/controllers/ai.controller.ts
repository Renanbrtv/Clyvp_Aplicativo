import type { Request, Response } from 'express';

import { requireUser } from '../middleware/authenticate';
import { clyQuota } from '../services/cly-quota.service';
import { aiService } from '../services/ai.service';
import { sendSuccess } from '../utils/http';

export const aiController = {
  async consent(req: Request, res: Response) { await clyQuota.consent(requireUser(req).id, req.body.accepted); return sendSuccess(res, { quota: await clyQuota.status(requireUser(req).id) }); },
  async generate(req: Request, res: Response) { return sendSuccess(res, await aiService.generate(requireUser(req).id, req.body.action, req.body.text)); },
  async status(req: Request, res: Response) {
    return sendSuccess(res, { ...aiService.status, quota: await clyQuota.status(requireUser(req).id) });
  },

  async proposal(req: Request, res: Response) {
    const user = requireUser(req);
    const { prompt, clientId } = req.body as { prompt: string; clientId?: number | null };
    const data = await aiService.generateProposal(user.id, prompt, clientId);
    return sendSuccess(res, data);
  },

  async message(req: Request, res: Response) {
    const user = requireUser(req);
    const { kind, clientId, extra } = req.body as {
      kind: never;
      clientId?: number | null;
      extra?: string | null;
    };
    const data = await aiService.generateMessage(user.id, kind, { clientId, extra });
    return sendSuccess(res, data);
  },

  async improve(req: Request, res: Response) {
    const user = requireUser(req);
    const { text } = req.body as { text: string };
    const data = await aiService.improveText(user.id, text);
    return sendSuccess(res, data);
  },
};
