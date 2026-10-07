import type { Request, Response } from 'express';

import { requireUser } from '../middleware/authenticate';
import { companyService } from '../services/company.service';
import { sendSuccess } from '../utils/http';
import type { UpdateCompanyInput } from '../validators/company.validator';

export const companyController = {
  /** GET /api/companies/me */
  async get(req: Request, res: Response) {
    const user = requireUser(req);
    const company = await companyService.getByUser(user.id);
    return sendSuccess(res, { company });
  },

  /** PATCH /api/companies/me */
  async update(req: Request, res: Response) {
    const user = requireUser(req);
    const company = await companyService.update(user.id, req.body as UpdateCompanyInput);
    return sendSuccess(res, { company }, { message: 'Dados da empresa atualizados.' });
  },
};
