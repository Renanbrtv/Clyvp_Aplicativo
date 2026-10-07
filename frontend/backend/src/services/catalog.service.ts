import { userRepository } from '../repositories/user.repository';
import { withTransaction } from '../config/database';
import { catalogRepository } from '../repositories/catalog.repository';
import { AppError } from '../utils/app-error';
import type {
  CreateProductInput,
  CreateServiceInput,
  UpdateProductInput,
  UpdateServiceInput,
} from '../validators/catalog.validator';
import { toPublicCategory, toPublicProduct, toPublicService } from './mappers2';
import { planLimitService } from './plan-limit.service';

interface ListOptions {
  search?: string;
  categoryId?: number;
  onlyActive?: boolean;
}

async function assertCategory(userId: number, categoryId: number | null | undefined, type: 'produto' | 'servico') {
  if (categoryId === null || categoryId === undefined) return;

  const category = await catalogRepository.findCategory(userId, categoryId);
  if (!category) throw AppError.badRequest('Categoria nao encontrada.');
  if (category.type !== type) {
    throw AppError.badRequest(`Essa categoria e de ${category.type}, nao de ${type}.`);
  }
}

export const catalogService = {
  /* ------------------------------ Categorias ------------------------------ */
  async listCategories(userId: number, type?: 'produto' | 'servico') {
    const rows = await catalogRepository.listCategories(userId, type);
    return rows.map(toPublicCategory);
  },

  async createCategory(userId: number, type: 'produto' | 'servico', name: string, color?: string | null) {
    const id = await catalogRepository.createCategory(userId, type, name, color);
    const created = await catalogRepository.findCategory(userId, id);
    if (!created) throw AppError.internal('Falha ao criar a categoria.');
    return toPublicCategory(created);
  },

  async removeCategory(userId: number, id: number) {
    const affected = await catalogRepository.deleteCategory(userId, id);
    if (affected === 0) throw AppError.notFound('Categoria nao encontrada.');
  },

  /* ------------------------------- Produtos ------------------------------- */
  async listProducts(userId: number, options: ListOptions = {}) {
    const rows = await catalogRepository.listProducts(userId, options);
    return rows.map(toPublicProduct);
  },

  async getProduct(userId: number, id: number) {
    const row = await catalogRepository.findProduct(userId, id);
    if (!row) throw AppError.notFound('Produto nao encontrado.');
    return toPublicProduct(row);
  },

  async createProduct(userId: number, input: CreateProductInput) {
    return withTransaction(async () => {
      await userRepository.lock(userId);
    await planLimitService.assertCanCreate(userId, 'catalogo');
    await assertCategory(userId, input.categoryId, 'produto');

    const id = await catalogRepository.createProduct(userId, input);
    return catalogService.getProduct(userId, id);
    });
  },

  async updateProduct(userId: number, id: number, input: UpdateProductInput) {
    const existing = await catalogRepository.findProduct(userId, id);
    if (!existing) throw AppError.notFound('Produto nao encontrado.');

    await assertCategory(userId, input.categoryId, 'produto');
    await catalogRepository.updateProduct(userId, id, input);
    return catalogService.getProduct(userId, id);
  },

  async removeProduct(userId: number, id: number) {
    const affected = await catalogRepository.deleteProduct(userId, id);
    if (affected === 0) throw AppError.notFound('Produto nao encontrado.');
  },

  /* ------------------------------- Servicos ------------------------------- */
  async listServices(userId: number, options: ListOptions = {}) {
    const rows = await catalogRepository.listServices(userId, options);
    return rows.map(toPublicService);
  },

  async getService(userId: number, id: number) {
    const row = await catalogRepository.findService(userId, id);
    if (!row) throw AppError.notFound('Servico nao encontrado.');
    return toPublicService(row);
  },

  async createService(userId: number, input: CreateServiceInput) {
    return withTransaction(async () => {
      await userRepository.lock(userId);
    await planLimitService.assertCanCreate(userId, 'catalogo');
    await assertCategory(userId, input.categoryId, 'servico');

    const id = await catalogRepository.createService(userId, input);
    return catalogService.getService(userId, id);
    });
  },

  async updateService(userId: number, id: number, input: UpdateServiceInput) {
    const existing = await catalogRepository.findService(userId, id);
    if (!existing) throw AppError.notFound('Servico nao encontrado.');

    await assertCategory(userId, input.categoryId, 'servico');
    await catalogRepository.updateService(userId, id, input);
    return catalogService.getService(userId, id);
  },

  async removeService(userId: number, id: number) {
    const affected = await catalogRepository.deleteService(userId, id);
    if (affected === 0) throw AppError.notFound('Servico nao encontrado.');
  },

  /** Catalogo unificado - usado na tela de montar proposta. */
  async fullCatalog(userId: number, search?: string) {
    const [products, services] = await Promise.all([
      catalogRepository.listProducts(userId, { search, onlyActive: true }),
      catalogRepository.listServices(userId, { search, onlyActive: true }),
    ]);

    return {
      products: products.map(toPublicProduct),
      services: services.map(toPublicService),
    };
  },
};
