import { Router } from 'express';

import { quoteController } from '../controllers/quote.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/http';
import { changeQuoteStatusSchema, createQuoteSchema, updateQuoteSchema } from '../validators/quote.validator';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(quoteController.list));
router.post('/', validate(createQuoteSchema), asyncHandler(quoteController.create));
router.get('/:id', asyncHandler(quoteController.detail));
router.get('/:id/documento', asyncHandler(quoteController.document));
router.get('/:id/whatsapp', asyncHandler(quoteController.whatsapp));
router.patch('/:id', validate(updateQuoteSchema), asyncHandler(quoteController.update));
router.post('/:id/status', validate(changeQuoteStatusSchema), asyncHandler(quoteController.changeStatus));
router.delete('/:id', asyncHandler(quoteController.remove));

export { router as quoteRoutes };
