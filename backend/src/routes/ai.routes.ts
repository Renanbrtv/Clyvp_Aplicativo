import { z } from 'zod';
import { Router } from 'express';

import { aiController } from '../controllers/ai.controller';
import { authRateLimiter } from '../middleware/rate-limit';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/http';
import { generateMessageSchema, generateProposalSchema, improveTextSchema } from '../validators/ai.validator';

const router = Router();
router.use(authenticate);


router.get('/status', asyncHandler(aiController.status));
router.post('/consent', authRateLimiter, validate(z.object({ accepted: z.boolean() }).strict()), asyncHandler(aiController.consent));
router.post('/generate', authRateLimiter, validate(z.object({ action: z.enum(['mensagem','descricao','proposta']), text: z.string().trim().min(2).max(2000) }).strict()), asyncHandler(aiController.generate));
router.use(authRateLimiter);
router.post('/proposta', validate(generateProposalSchema), asyncHandler(aiController.proposal));
router.post('/mensagem', validate(generateMessageSchema), asyncHandler(aiController.message));
router.post('/melhorar-texto', validate(improveTextSchema), asyncHandler(aiController.improve));

export { router as aiRoutes };
