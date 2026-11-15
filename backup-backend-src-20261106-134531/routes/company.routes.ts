import { Router } from 'express';

import { companyController } from '../controllers/company.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/http';
import { updateCompanySchema } from '../validators/company.validator';

const router = Router();

router.use(authenticate);

router.get('/me', asyncHandler(companyController.get));
router.patch('/me', validate(updateCompanySchema), asyncHandler(companyController.update));

export { router as companyRoutes };
