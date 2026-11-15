import type { Request, Response } from 'express';

import { requireUser } from '../middleware/authenticate';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/http';

export const dashboardController = {
  /** GET /api/dashboard?month=2026-09 */
  async summary(req: Request, res: Response) {
    const user = requireUser(req);
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const data = await dashboardService.getSummary(user.id, month);
    return sendSuccess(res, data);
  },
};
