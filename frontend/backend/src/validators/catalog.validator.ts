import { z } from 'zod';

const money = z.coerce.number().min(0, 'O valor nao pode ser negativo.').max(99999999);

export const createCategorySchema = z
  .object({
    type: z.enum(['produto', 'servico']),
    name: z.string().trim().min(2).max(80),
    color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, 'Use uma cor no formato #RRGGBB.').nullable().optional(),
  })
  .strict();

const productBase = {
  name: z.string().trim().min(2, 'Informe o nome.').max(140),
  description: z.string().trim().max(2000).nullable().optional(),
  sku: z.string().trim().max(60).nullable().optional(),
  price: money,
  promoPrice: money.nullable().optional(),
  costPrice: money.nullable().optional(),
  trackStock: z.boolean().optional(),
  stock: z.coerce.number().int().min(0).max(999999).optional(),
  photoUrl: z.string().trim().url('Informe uma URL valida.').max(255).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
};

export const createProductSchema = z
  .object(productBase)
  .strict()
  .refine(
    (data) => data.promoPrice === null || data.promoPrice === undefined || data.promoPrice <= data.price,
    { message: 'O preco promocional precisa ser menor que o preco normal.', path: ['promoPrice'] },
  );

export const updateProductSchema = z
  .object({ ...productBase, name: productBase.name.optional(), price: money.optional() })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'Informe ao menos um campo.' });

const serviceBase = {
  name: z.string().trim().min(2, 'Informe o nome.').max(140),
  description: z.string().trim().max(2000).nullable().optional(),
  price: money,
  estimatedTimeMinutes: z.coerce.number().int().min(0).max(100000).nullable().optional(),
  warrantyDays: z.coerce.number().int().min(0).max(3650).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
};

export const createServiceSchema = z.object(serviceBase).strict();

export const updateServiceSchema = z
  .object({ ...serviceBase, name: serviceBase.name.optional(), price: money.optional() })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'Informe ao menos um campo.' });

export const listCatalogSchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    onlyActive: z.coerce.boolean().optional(),
  })
  .passthrough();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
