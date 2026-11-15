import { Router } from 'express';

import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/authenticate';
import { asyncHandler } from '../utils/http';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(notificationController.list));
router.post('/atualizar', asyncHandler(notificationController.refresh));
router.post('/ler-todas', asyncHandler(notificationController.markAllAsRead));
router.post('/:id/ler', asyncHandler(notificationController.markAsRead));
router.delete('/:id', asyncHandler(notificationController.remove));

export { router as notificationRoutes };
