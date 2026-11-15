import type { Request, Response } from 'express';

import { requireUser } from '../middleware/authenticate';
import { quoteService } from '../services/quote.service';
import { sendCreated, sendSuccess } from '../utils/http';
import type { CreateQuoteInput, UpdateQuoteInput } from '../validators/quote.validator';

export const quoteController = {
  async list(req: Request, res: Response) {
    const user = requireUser(req);
    const { quotes, meta } = await quoteService.list(user.id, {
      status: req.query.status as never,
      type: req.query.type as never,
      clientId: req.query.clientId ? Number(req.query.clientId) : undefined,
      opportunityId: req.query.opportunityId ? Number(req.query.opportunityId) : undefined,
      pending: req.query.pending === 'true' || req.query.pending === '1',
      page: req.query.page ? Number(req.query.page) : undefined,
      perPage: req.query.perPage ? Number(req.query.perPage) : undefined,
    });

    return sendSuccess(res, { quotes }, { meta });
  },

  async detail(req: Request, res: Response) {
    const user = requireUser(req);
    const quote = await quoteService.getById(user.id, Number(req.params.id));
    return sendSuccess(res, { quote });
  },

  /** Payload completo com empresa e cliente - a tela da proposta e o PDF. */
  async document(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await quoteService.getForDocument(user.id, Number(req.params.id));
    return sendSuccess(res, data);
  },

  async create(req: Request, res: Response) {
    const user = requireUser(req);
    const quote = await quoteService.create(user.id, req.body as CreateQuoteInput);
    return sendCreated(res, { quote }, 'Orcamento criado.');
  },

  async update(req: Request, res: Response) {
    const user = requireUser(req);
    const quote = await quoteService.update(user.id, Number(req.params.id), req.body as UpdateQuoteInput);
    return sendSuccess(res, { quote }, { message: 'Orcamento atualizado.' });
  },

  async changeStatus(req: Request, res: Response) {
    const user = requireUser(req);
    const { status, note } = req.body as { status: never; note?: string | null };
    const quote = await quoteService.changeStatus(user.id, Number(req.params.id), status, note);
    return sendSuccess(res, { quote }, { message: 'Status atualizado.' });
  },

  async whatsapp(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await quoteService.whatsappMessage(user.id, Number(req.params.id));
    return sendSuccess(res, data);
  },

  async remove(req: Request, res: Response) {
    const user = requireUser(req);
    await quoteService.remove(user.id, Number(req.params.id));
    return sendSuccess(res, null, { message: 'Orcamento excluido.' });
  },
};
