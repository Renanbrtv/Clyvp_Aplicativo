import { Router } from 'express';

import { saleController } from '../controllers/sale.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/http';
import { createSaleSchema } from '../validators/sale.validator';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(saleController.list));
router.post('/', validate(createSaleSchema), asyncHandler(saleController.create));
router.delete('/:id', asyncHandler(saleController.remove));

export { router as saleRoutes };
