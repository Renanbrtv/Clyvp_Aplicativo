import { Router } from 'express';

import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/http';
import { updateProfileSchema, updateSettingsSchema } from '../validators/user.validator';

const router = Router();

// Todas as rotas de usuario exigem autenticacao.
router.use(authenticate);

router.get('/me/export', asyncHandler(userController.exportData));
router.get('/me', asyncHandler(userController.getProfile));
router.patch('/me', validate(updateProfileSchema), asyncHandler(userController.updateProfile));
router.delete('/me', asyncHandler(userController.deleteAccount));

router.get('/me/settings', asyncHandler(userController.getSettings));
router.patch(
  '/me/settings',
  validate(updateSettingsSchema),
  asyncHandler(userController.updateSettings),
);

export { router as userRoutes };
