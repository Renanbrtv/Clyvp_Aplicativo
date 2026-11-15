import type { Request, Response } from 'express';

import { requireUser } from '../middleware/authenticate';
import { planLimitService } from '../services/plan-limit.service';
import { statsService } from '../services/stats.service';
import { sendSuccess } from '../utils/http';

export const statsController = {
  async results(req: Request, res: Response) {
    const user = requireUser(req);
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const data = await statsService.results(user.id, month);
    return sendSuccess(res, data);
  },

  /** Quanto do plano ja foi usado no mes. */
  async usage(req: Request, res: Response) {
    const user = requireUser(req);
    const usage = await planLimitService.usage(user.id);
    return sendSuccess(res, { usage });
  },
};
