import { Router } from 'express';

import { clientController } from '../controllers/client.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/http';
import { createClientSchema, updateClientSchema } from '../validators/client.validator';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(clientController.list));
router.post('/', validate(createClientSchema), asyncHandler(clientController.create));
router.get('/:id', asyncHandler(clientController.detail));
router.patch('/:id', validate(updateClientSchema), asyncHandler(clientController.update));
router.delete('/:id', asyncHandler(clientController.remove));
router.post('/:id/contato', asyncHandler(clientController.registerContact));
router.get('/:id/whatsapp', asyncHandler(clientController.whatsapp));

export { router as clientRoutes };
