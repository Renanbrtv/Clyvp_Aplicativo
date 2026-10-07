import type { Request, Response } from 'express';

import { requireUser } from '../middleware/authenticate';
import { opportunityService } from '../services/opportunity.service';
import { sendCreated, sendSuccess } from '../utils/http';
import type {
  ChangeStatusInput,
  CreateOpportunityInput,
  UpdateOpportunityInput,
} from '../validators/opportunity.validator';

export const opportunityController = {
  async list(req: Request, res: Response) {
    const user = requireUser(req);
    const { opportunities, meta } = await opportunityService.list(user.id, {
      status: req.query.status as never,
      clientId: req.query.clientId ? Number(req.query.clientId) : undefined,
      search: req.query.search as string | undefined,
      open: req.query.open === 'true' || req.query.open === '1',
      page: req.query.page ? Number(req.query.page) : undefined,
      perPage: req.query.perPage ? Number(req.query.perPage) : undefined,
    });

    return sendSuccess(res, { opportunities }, { meta });
  },

  async pipeline(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await opportunityService.pipeline(user.id);
    return sendSuccess(res, data);
  },

  async detail(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await opportunityService.getById(user.id, Number(req.params.id));
    return sendSuccess(res, data);
  },

  async create(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await opportunityService.create(user.id, req.body as CreateOpportunityInput);
    return sendCreated(res, data, 'Oportunidade criada.');
  },

  async update(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await opportunityService.update(
      user.id,
      Number(req.params.id),
      req.body as UpdateOpportunityInput,
    );
    return sendSuccess(res, data, { message: 'Oportunidade atualizada.' });
  },

  async changeStatus(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await opportunityService.changeStatus(
      user.id,
      Number(req.params.id),
      req.body as ChangeStatusInput,
    );
    return sendSuccess(res, data, { message: 'Status atualizado.' });
  },

  async registerContact(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await opportunityService.registerContact(user.id, Number(req.params.id));
    return sendSuccess(res, data, { message: 'Contato registrado.' });
  },

  async remove(req: Request, res: Response) {
    const user = requireUser(req);
    await opportunityService.remove(user.id, Number(req.params.id));
    return sendSuccess(res, null, { message: 'Oportunidade excluida.' });
  },
};
