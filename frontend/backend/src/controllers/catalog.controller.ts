import type { Request, Response } from 'express';

import { requireUser } from '../middleware/authenticate';
import { catalogService } from '../services/catalog.service';
import { sendCreated, sendSuccess } from '../utils/http';
import type {
  CreateProductInput,
  CreateServiceInput,
  UpdateProductInput,
  UpdateServiceInput,
} from '../validators/catalog.validator';

function listOptions(req: Request) {
  return {
    search: req.query.search as string | undefined,
    categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
    onlyActive: req.query.onlyActive === 'true' || req.query.onlyActive === '1',
  };
}

export const catalogController = {
  async listCategories(req: Request, res: Response) {
    const user = requireUser(req);
    const type = req.query.type as 'produto' | 'servico' | undefined;
    const categories = await catalogService.listCategories(user.id, type);
    return sendSuccess(res, { categories });
  },

  async createCategory(req: Request, res: Response) {
    const user = requireUser(req);
    const { type, name, color } = req.body as { type: 'produto' | 'servico'; name: string; color?: string | null };
    const category = await catalogService.createCategory(user.id, type, name, color);
    return sendCreated(res, { category }, 'Categoria criada.');
  },

  async removeCategory(req: Request, res: Response) {
    const user = requireUser(req);
    await catalogService.removeCategory(user.id, Number(req.params.id));
    return sendSuccess(res, null, { message: 'Categoria excluida.' });
  },

  async listProducts(req: Request, res: Response) {
    const user = requireUser(req);
    const products = await catalogService.listProducts(user.id, listOptions(req));
    return sendSuccess(res, { products });
  },

  async getProduct(req: Request, res: Response) {
    const user = requireUser(req);
    const product = await catalogService.getProduct(user.id, Number(req.params.id));
    return sendSuccess(res, { product });
  },

  async createProduct(req: Request, res: Response) {
    const user = requireUser(req);
    const product = await catalogService.createProduct(user.id, req.body as CreateProductInput);
    return sendCreated(res, { product }, 'Produto cadastrado.');
  },

  async updateProduct(req: Request, res: Response) {
    const user = requireUser(req);
    const product = await catalogService.updateProduct(
      user.id,
      Number(req.params.id),
      req.body as UpdateProductInput,
    );
    return sendSuccess(res, { product }, { message: 'Produto atualizado.' });
  },

  async removeProduct(req: Request, res: Response) {
    const user = requireUser(req);
    await catalogService.removeProduct(user.id, Number(req.params.id));
    return sendSuccess(res, null, { message: 'Produto excluido.' });
  },

  async listServices(req: Request, res: Response) {
    const user = requireUser(req);
    const services = await catalogService.listServices(user.id, listOptions(req));
    return sendSuccess(res, { services });
  },

  async getService(req: Request, res: Response) {
    const user = requireUser(req);
    const service = await catalogService.getService(user.id, Number(req.params.id));
    return sendSuccess(res, { service });
  },

  async createService(req: Request, res: Response) {
    const user = requireUser(req);
    const service = await catalogService.createService(user.id, req.body as CreateServiceInput);
    return sendCreated(res, { service }, 'Servico cadastrado.');
  },

  async updateService(req: Request, res: Response) {
    const user = requireUser(req);
    const service = await catalogService.updateService(
      user.id,
      Number(req.params.id),
      req.body as UpdateServiceInput,
    );
    return sendSuccess(res, { service }, { message: 'Servico atualizado.' });
  },

  async removeService(req: Request, res: Response) {
    const user = requireUser(req);
    await catalogService.removeService(user.id, Number(req.params.id));
    return sendSuccess(res, null, { message: 'Servico excluido.' });
  },

  /** Produtos + servicos ativos - usado ao montar a proposta. */
  async full(req: Request, res: Response) {
    const user = requireUser(req);
    const data = await catalogService.fullCatalog(user.id, req.query.search as string | undefined);
    return sendSuccess(res, data);
  },
};
