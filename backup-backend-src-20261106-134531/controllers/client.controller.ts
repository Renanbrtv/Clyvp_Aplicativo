import type { Request, Response } from 'express';

import { requireUser } from '../middleware/authenticate';
import { clientService } from '../services/client.service';
import { whatsappService } from '../services/whatsapp.service';
import { sendCreated, sendSuccess } from '../utils/http';
import type { CreateClientInput, UpdateClientInput } from '../validators/client.validator';

export const clientController = {
  async list(req: Request, res: Response) {
    const user = requireUser(req);
    const { clients, meta } = await clientService.list(user.id, {
      search: req.query.search as string | undefined,
      filter: req.query.filter as never,
      page: req.query.page ? Number(req.query.page) : undefined,
      perPage: req.query.perPage ? Number(req.query.perPage) : undefined,
    });

    return sendSuccess(res, { clients }, { meta });
  },

  async detail(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await clientService.getDetail(user.id, Number(req.params.id));
    return sendSuccess(res, data);
  },

  async create(req: Request, res: Response) {
    const user = requireUser(req);
    const client = await clientService.create(user.id, req.body as CreateClientInput);
    return sendCreated(res, { client }, 'Cliente cadastrado.');
  },

  async update(req: Request, res: Response) {
    const user = requireUser(req);
    const client = await clientService.update(user.id, Number(req.params.id), req.body as UpdateClientInput);
    return sendSuccess(res, { client }, { message: 'Cliente atualizado.' });
  },

  async remove(req: Request, res: Response) {
    const user = requireUser(req);
    await clientService.remove(user.id, Number(req.params.id));
    return sendSuccess(res, null, { message: 'Cliente excluido.' });
  },

  async registerContact(req: Request, res: Response) {
    const user = requireUser(req);
    const client = await clientService.registerContact(user.id, Number(req.params.id));
    return sendSuccess(res, { client }, { message: 'Contato registrado.' });
  },

  /** Mensagem pronta de WhatsApp para o cliente. */
  async whatsapp(req: Request, res: Response) {
    const user = requireUser(req);
    const client = await clientService.getById(user.id, Number(req.params.id));
    const kind = (req.query.kind as string) || 'primeiro_contato';

    const message = await whatsappService.build(user.id, kind as never, { clientName: client.name });
    const link = whatsappService.link(client.whatsapp, message);

    return sendSuccess(res, { message, link, phone: client.whatsapp });
  },
};
