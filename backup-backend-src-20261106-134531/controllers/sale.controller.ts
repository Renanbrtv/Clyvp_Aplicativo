import type { Request, Response } from 'express';

import { requireUser } from '../middleware/authenticate';
import { saleService } from '../services/sale.service';
import { sendCreated, sendSuccess } from '../utils/http';
import type { CreateSaleInput } from '../validators/sale.validator';

export const saleController = {
  async list(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await saleService.list(user.id, {
      clientId: req.query.clientId ? Number(req.query.clientId) : undefined,
      month: req.query.month as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      perPage: req.query.perPage ? Number(req.query.perPage) : undefined,
    });

    return sendSuccess(res, data);
  },

  async create(req: Request, res: Response) {
    const user = requireUser(req);
    const sale = await saleService.create(user.id, req.body as CreateSaleInput);
    return sendCreated(res, { sale }, 'Venda registrada.');
  },

  async remove(req: Request, res: Response) {
    const user = requireUser(req);
    await saleService.remove(user.id, Number(req.params.id));
    return sendSuccess(res, null, { message: 'Venda excluida.' });
  },
};
