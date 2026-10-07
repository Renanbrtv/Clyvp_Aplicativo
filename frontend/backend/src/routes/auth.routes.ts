import { Router } from 'express';

import { userService } from '../services/user.service';
import { userRepository } from '../repositories/user.repository';
import { fakePasswordCheck, verifyPassword } from '../utils/password';
import { AppError } from '../utils/app-error';
import { sendSuccess } from '../utils/http';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { authRateLimiter } from '../middleware/rate-limit';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/http';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  onboardingSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();

/* ---------------------- Rotas publicas ---------------------- */
router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  asyncHandler(authController.register),
);

router.post('/login', authRateLimiter, validate(loginSchema), asyncHandler(authController.login));

router.post('/refresh', validate(refreshSchema), asyncHandler(authController.refresh));

router.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);

router.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);

// Exclusao disponivel no app e numa pagina publica, com reautenticacao.
router.post('/delete-account', authRateLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const user = await userRepository.findByEmail(req.body.email);
  if (!user) {
    await fakePasswordCheck();
    throw AppError.unauthorized('E-mail ou senha incorretos.', 'INVALID_CREDENTIALS');
  }
  if (!await verifyPassword(req.body.password, user.password_hash)) {
    throw AppError.unauthorized('E-mail ou senha incorretos.', 'INVALID_CREDENTIALS');
  }
  await userService.deleteAccount(user.id);
  return sendSuccess(res, null, { message: 'Conta e dados excluidos.' });
}));

/* --------------------- Rotas autenticadas -------------------- */
router.get('/me', authenticate, asyncHandler(authController.me));

router.post('/logout', authenticate, validate(logoutSchema), asyncHandler(authController.logout));

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword),
);

router.post(
  '/onboarding',
  authenticate,
  validate(onboardingSchema),
  asyncHandler(authController.onboarding),
);

export { router as authRoutes };
