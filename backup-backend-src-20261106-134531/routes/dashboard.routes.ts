import { Router } from 'express';

import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/authenticate';
import { asyncHandler } from '../utils/http';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(dashboardController.summary));

export { router as dashboardRoutes };
