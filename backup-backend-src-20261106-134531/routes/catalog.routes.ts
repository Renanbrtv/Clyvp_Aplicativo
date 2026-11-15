import { Router } from 'express';

import { catalogController } from '../controllers/catalog.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/http';
import {
  createCategorySchema,
  createProductSchema,
  createServiceSchema,
  updateProductSchema,
  updateServiceSchema,
} from '../validators/catalog.validator';

/* --------------------------- /api/products --------------------------- */
const products = Router();
products.use(authenticate);
products.get('/', asyncHandler(catalogController.listProducts));
products.post('/', validate(createProductSchema), asyncHandler(catalogController.createProduct));
products.get('/:id', asyncHandler(catalogController.getProduct));
products.patch('/:id', validate(updateProductSchema), asyncHandler(catalogController.updateProduct));
products.delete('/:id', asyncHandler(catalogController.removeProduct));

/* --------------------------- /api/services --------------------------- */
const services = Router();
services.use(authenticate);
services.get('/', asyncHandler(catalogController.listServices));
services.post('/', validate(createServiceSchema), asyncHandler(catalogController.createService));
services.get('/:id', asyncHandler(catalogController.getService));
services.patch('/:id', validate(updateServiceSchema), asyncHandler(catalogController.updateService));
services.delete('/:id', asyncHandler(catalogController.removeService));

/* --------------------------- /api/catalog ---------------------------- */
const catalog = Router();
catalog.use(authenticate);
catalog.get('/', asyncHandler(catalogController.full));
catalog.get('/categorias', asyncHandler(catalogController.listCategories));
catalog.post('/categorias', validate(createCategorySchema), asyncHandler(catalogController.createCategory));
catalog.delete('/categorias/:id', asyncHandler(catalogController.removeCategory));

export { products as productRoutes, services as serviceRoutes, catalog as catalogRoutes };
