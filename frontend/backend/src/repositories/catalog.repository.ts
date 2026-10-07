import { execute, query, queryOne } from '../config/database';
import type { CountRow } from '../types/models';
import type { CategoryRow, ProductRow, ServiceRow } from '../types/models2';

export interface ProductInput {
  name: string;
  description?: string | null;
  sku?: string | null;
  price: number;
  promoPrice?: number | null;
  costPrice?: number | null;
  trackStock?: boolean;
  stock?: number;
  photoUrl?: string | null;
  notes?: string | null;
  categoryId?: number | null;
  isActive?: boolean;
}

export interface ServiceInput {
  name: string;
  description?: string | null;
  price: number;
  estimatedTimeMinutes?: number | null;
  warrantyDays?: number | null;
  notes?: string | null;
  categoryId?: number | null;
  isActive?: boolean;
}

const PRODUCT_COLUMNS: Record<string, string> = {
  name: 'name',
  description: 'description',
  sku: 'sku',
  price: 'price',
  promoPrice: 'promo_price',
  costPrice: 'cost_price',
  trackStock: 'track_stock',
  stock: 'stock',
  photoUrl: 'photo_url',
  notes: 'notes',
  categoryId: 'category_id',
  isActive: 'is_active',
};

const SERVICE_COLUMNS: Record<string, string> = {
  name: 'name',
  description: 'description',
  price: 'price',
  estimatedTimeMinutes: 'estimated_time_minutes',
  warrantyDays: 'warranty_days',
  notes: 'notes',
  categoryId: 'category_id',
  isActive: 'is_active',
};

const toDb = (value: unknown): unknown => (typeof value === 'boolean' ? (value ? 1 : 0) : value);

function buildInsert(table: string, columns: Record<string, string>, userId: number, input: object) {
  const fields = ['user_id'];
  const placeholders = ['?'];
  const params: unknown[] = [userId];

  Object.keys(columns).forEach((key) => {
    const value = (input as Record<string, unknown>)[key];
    if (value === undefined) return;
    fields.push(`\`${columns[key]}\``);
    placeholders.push('?');
    params.push(toDb(value));
  });

  return { sql: `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`, params };
}

function buildUpdate(
  table: string,
  columns: Record<string, string>,
  userId: number,
  id: number,
  input: object,
) {
  const sets: string[] = [];
  const params: unknown[] = [];

  Object.keys(columns).forEach((key) => {
    const value = (input as Record<string, unknown>)[key];
    if (value === undefined) return;
    sets.push(`\`${columns[key]}\` = ?`);
    params.push(toDb(value));
  });

  if (sets.length === 0) return null;
  params.push(id, userId);
  return { sql: `UPDATE ${table} SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, params };
}

export const catalogRepository = {
  /* --------------------------- Categorias --------------------------- */
  async listCategories(userId: number, type?: 'produto' | 'servico'): Promise<CategoryRow[]> {
    if (type) {
      return query<CategoryRow>(
        'SELECT * FROM categories WHERE user_id = ? AND type = ? ORDER BY name ASC',
        [userId, type],
      );
    }
    return query<CategoryRow>('SELECT * FROM categories WHERE user_id = ? ORDER BY type, name', [userId]);
  },

  async findCategory(userId: number, id: number): Promise<CategoryRow | null> {
    return queryOne<CategoryRow>('SELECT * FROM categories WHERE id = ? AND user_id = ? LIMIT 1', [
      id,
      userId,
    ]);
  },

  async createCategory(
    userId: number,
    type: 'produto' | 'servico',
    name: string,
    color?: string | null,
  ): Promise<number> {
    const result = await execute(
      'INSERT INTO categories (user_id, type, name, color) VALUES (?, ?, ?, ?)',
      [userId, type, name, color ?? null],
    );
    return result.insertId;
  },

  async deleteCategory(userId: number, id: number): Promise<number> {
    const result = await execute('DELETE FROM categories WHERE id = ? AND user_id = ?', [id, userId]);
    return result.affectedRows;
  },

  /* ---------------------------- Produtos ---------------------------- */
  async listProducts(
    userId: number,
    options: { search?: string; categoryId?: number; onlyActive?: boolean } = {},
  ): Promise<ProductRow[]> {
    let where = 'p.user_id = ? AND p.deleted_at IS NULL';
    const params: unknown[] = [userId];

    if (options.onlyActive) where += ' AND p.is_active = 1';
    if (options.categoryId) {
      where += ' AND p.category_id = ?';
      params.push(options.categoryId);
    }
    if (options.search && options.search.trim().length > 0) {
      where += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      const term = `%${options.search.trim()}%`;
      params.push(term, term);
    }

    return query<ProductRow>(
      `SELECT p.*, c.name AS category_name
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
        WHERE ${where} ORDER BY p.name ASC`,
      params,
    );
  },

  async findProduct(userId: number, id: number): Promise<ProductRow | null> {
    return queryOne<ProductRow>(
      `SELECT p.*, c.name AS category_name
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ? AND p.user_id = ? AND p.deleted_at IS NULL LIMIT 1`,
      [id, userId],
    );
  },

  async createProduct(userId: number, input: ProductInput): Promise<number> {
    const { sql, params } = buildInsert('products', PRODUCT_COLUMNS, userId, input);
    const result = await execute(sql, params);
    return result.insertId;
  },

  async updateProduct(userId: number, id: number, input: Partial<ProductInput>): Promise<void> {
    const built = buildUpdate('products', PRODUCT_COLUMNS, userId, id, input);
    if (built) await execute(built.sql, built.params);
  },

  async deleteProduct(userId: number, id: number): Promise<number> {
    const result = await execute(
      'UPDATE products SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId],
    );
    return result.affectedRows;
  },

  async decreaseStock(userId: number, productId: number, quantity: number): Promise<void> {
    await execute(
      'UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ? AND user_id = ? AND track_stock = 1',
      [quantity, productId, userId],
    );
  },

  /* ---------------------------- Servicos ---------------------------- */
  async listServices(
    userId: number,
    options: { search?: string; categoryId?: number; onlyActive?: boolean } = {},
  ): Promise<ServiceRow[]> {
    let where = 's.user_id = ? AND s.deleted_at IS NULL';
    const params: unknown[] = [userId];

    if (options.onlyActive) where += ' AND s.is_active = 1';
    if (options.categoryId) {
      where += ' AND s.category_id = ?';
      params.push(options.categoryId);
    }
    if (options.search && options.search.trim().length > 0) {
      where += ' AND s.name LIKE ?';
      params.push(`%${options.search.trim()}%`);
    }

    return query<ServiceRow>(
      `SELECT s.*, c.name AS category_name
         FROM services s LEFT JOIN categories c ON c.id = s.category_id
        WHERE ${where} ORDER BY s.name ASC`,
      params,
    );
  },

  async findService(userId: number, id: number): Promise<ServiceRow | null> {
    return queryOne<ServiceRow>(
      `SELECT s.*, c.name AS category_name
         FROM services s LEFT JOIN categories c ON c.id = s.category_id
        WHERE s.id = ? AND s.user_id = ? AND s.deleted_at IS NULL LIMIT 1`,
      [id, userId],
    );
  },

  async createService(userId: number, input: ServiceInput): Promise<number> {
    const { sql, params } = buildInsert('services', SERVICE_COLUMNS, userId, input);
    const result = await execute(sql, params);
    return result.insertId;
  },

  async updateService(userId: number, id: number, input: Partial<ServiceInput>): Promise<void> {
    const built = buildUpdate('services', SERVICE_COLUMNS, userId, id, input);
    if (built) await execute(built.sql, built.params);
  },

  async deleteService(userId: number, id: number): Promise<number> {
    const result = await execute(
      'UPDATE services SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId],
    );
    return result.affectedRows;
  },

  /** Produtos + servicos - usado para aplicar o limite do plano. */
  async countCatalogItems(userId: number): Promise<number> {
    const row = await queryOne<CountRow>(
      `SELECT (SELECT COUNT(*) FROM products WHERE user_id = ? AND deleted_at IS NULL)
            + (SELECT COUNT(*) FROM services WHERE user_id = ? AND deleted_at IS NULL) AS total`,
      [userId, userId],
    );
    return row?.total ?? 0;
  },
};
