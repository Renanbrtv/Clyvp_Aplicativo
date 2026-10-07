import { billingService } from '../services/billing.service';
import { requireUser } from '../middleware/authenticate';
import { authRateLimiter } from '../middleware/rate-limit';
import { sendSuccess } from '../utils/http';
import { Router } from 'express';

import { subscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/http';
import { upgradeSchema } from '../validators/subscription.validator';

const router = Router();

router.get('/billing', authenticate, asyncHandler(async (req, res) => {
  const id = requireUser(req).id;
  return sendSuccess(res, { configured: billingService.configured, appUserId: billingService.configured ? (await billingService.identity(id)).app_user_id : null });
}));
router.post('/sync', authenticate, authRateLimiter, asyncHandler(async (req, res) => {
  await billingService.sync(requireUser(req).id, true); return sendSuccess(res, { synced: billingService.configured });
}));
// Publica: a tela de planos aparece antes do login.
router.get('/plans', asyncHandler(subscriptionController.listPlans));

// Assinatura do usuario logado.
router.get('/me', authenticate, asyncHandler(subscriptionController.getCurrent));
router.post(
  '/upgrade',
  authenticate,
  validate(upgradeSchema),
  asyncHandler(subscriptionController.previewUpgrade),
);

export { router as subscriptionRoutes };
