import { Router } from 'express';

import { opportunityController } from '../controllers/opportunity.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/http';
import {
  changeStatusSchema,
  createOpportunitySchema,
  updateOpportunitySchema,
} from '../validators/opportunity.validator';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(opportunityController.list));
router.get('/pipeline', asyncHandler(opportunityController.pipeline));
router.post('/', validate(createOpportunitySchema), asyncHandler(opportunityController.create));
router.get('/:id', asyncHandler(opportunityController.detail));
router.patch('/:id', validate(updateOpportunitySchema), asyncHandler(opportunityController.update));
router.post('/:id/status', validate(changeStatusSchema), asyncHandler(opportunityController.changeStatus));
router.post('/:id/contato', asyncHandler(opportunityController.registerContact));
router.delete('/:id', asyncHandler(opportunityController.remove));

export { router as opportunityRoutes };
