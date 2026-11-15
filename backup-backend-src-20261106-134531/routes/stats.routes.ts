import { Router } from 'express';

import { statsController } from '../controllers/stats.controller';
import { authenticate } from '../middleware/authenticate';
import { asyncHandler } from '../utils/http';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(statsController.results));
router.get('/uso-do-plano', asyncHandler(statsController.usage));

export { router as statsRoutes };
