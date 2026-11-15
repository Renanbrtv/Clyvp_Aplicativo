import { Router } from 'express';

import { followUpController } from '../controllers/follow-up.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/http';
import { createFollowUpSchema, updateFollowUpStatusSchema } from '../validators/follow-up.validator';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(followUpController.list));
router.get('/agenda', asyncHandler(followUpController.agenda));
router.get('/recuperacao', asyncHandler(followUpController.recovery));
router.post('/', validate(createFollowUpSchema), asyncHandler(followUpController.create));
router.get('/:id/whatsapp', asyncHandler(followUpController.message));
router.post('/:id/status', validate(updateFollowUpStatusSchema), asyncHandler(followUpController.updateStatus));
router.delete('/:id', asyncHandler(followUpController.remove));

export { router as followUpRoutes };
