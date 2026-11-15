import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireUser } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler, sendSuccess } from '../utils/http';
import { emailService } from '../services/email.service';
import { supportSchema, supportService, SUPPORT_EMAIL } from '../services/support.service';
const router = Router();
const options = {
  windowMs: 3600000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'SUPPORT_RATE_LIMIT',
      message: 'Muitos pedidos de suporte. Aguarde uma hora ou escreva para skybreakersstudio@gmail.com.',
    },
  },
};
const perIp = rateLimit({ ...options, limit: 10 });
const perUser = rateLimit({ ...options, limit: 5, keyGenerator: (req) => String(requireUser(req).id) });
router.get('/', (_req, res) =>
  sendSuccess(res, { configured: emailService.configured, email: SUPPORT_EMAIL }),
);
router.post(
  '/',
  authenticate,
  perIp,
  perUser,
  validate(supportSchema),
  asyncHandler(async (req, res) => {
    const data = await supportService.send(requireUser(req), req.body);
    return sendSuccess(res, data, { message: 'Pedido aceito pelo servico de e-mail para envio ao suporte.' });
  }),
);
export { router as supportRoutes };
