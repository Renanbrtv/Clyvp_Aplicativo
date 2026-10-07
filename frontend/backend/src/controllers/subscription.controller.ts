import type { Request, Response } from 'express';

import { requireUser } from '../middleware/authenticate';
import { subscriptionService } from '../services/subscription.service';
import { sendSuccess } from '../utils/http';

export const subscriptionController = {
  /** GET /api/subscriptions/plans (publica) */
  async listPlans(_req: Request, res: Response) {
    const plans = await subscriptionService.listPlans();
    return sendSuccess(res, { plans });
  },

  /** GET /api/subscriptions/me (autenticada) */
  async getCurrent(req: Request, res: Response) {
    const user = requireUser(req);
    const subscription = await subscriptionService.getCurrent(user.id);
    return sendSuccess(res, { subscription });
  },

  /** POST /api/subscriptions/upgrade (autenticada) - ainda sem cobranca. */
  async previewUpgrade(req: Request, res: Response) {
    const user = requireUser(req);
    const { planCode } = req.body as { planCode: 'free' | 'pro' | 'pro_max' };
    const data = await subscriptionService.previewUpgrade(user.id, planCode);
    return sendSuccess(res, data);
  },
};
