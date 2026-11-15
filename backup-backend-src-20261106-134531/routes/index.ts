import { Router } from 'express';

import { APP_NAME, APP_TAGLINE } from '../config/constants';
import { healthController } from '../controllers/health.controller';
import { asyncHandler } from '../utils/http';
import { supportRoutes } from './support.routes';
import { marketplaceRoutes } from '../modules/marketplace/routes';
import { aiRoutes } from './ai.routes';
import { authRoutes } from './auth.routes';
import { catalogRoutes, productRoutes, serviceRoutes } from './catalog.routes';
import { clientRoutes } from './client.routes';
import { companyRoutes } from './company.routes';
import { dashboardRoutes } from './dashboard.routes';
import { followUpRoutes } from './follow-up.routes';
import { notificationRoutes } from './notification.routes';
import { opportunityRoutes } from './opportunity.routes';
import { quoteRoutes } from './quote.routes';
import { saleRoutes } from './sale.routes';
import { statsRoutes } from './stats.routes';
import { subscriptionRoutes } from './subscription.routes';
import { userRoutes } from './user.routes';

const router = Router();

/** Raiz da API: util para conferir rapidamente se o backend subiu. */
router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      app: APP_NAME,
      tagline: APP_TAGLINE,
      version: '1.0.0',
      stage: 'Etapas 1 a 15 (PDF no app, IA e pagamento preparados)',
      endpoints: {
        auth: [
          'POST   /api/auth/register',
          'POST   /api/auth/login',
          'POST   /api/auth/refresh',
          'POST   /api/auth/logout',
          'GET    /api/auth/me',
          'POST   /api/auth/change-password',
          'POST   /api/auth/forgot-password',
          'POST   /api/auth/reset-password',
          'POST   /api/auth/onboarding',
        ],
        conta: [
          'GET    /api/users/me',
          'PATCH  /api/users/me',
          'DELETE /api/users/me',
          'GET    /api/users/me/settings',
          'PATCH  /api/users/me/settings',
          'GET    /api/companies/me',
          'PATCH  /api/companies/me',
        ],
        clientes: [
          'GET    /api/clients',
          'POST   /api/clients',
          'GET    /api/clients/:id',
          'PATCH  /api/clients/:id',
          'DELETE /api/clients/:id',
          'POST   /api/clients/:id/contato',
          'GET    /api/clients/:id/whatsapp',
        ],
        catalogo: [
          'GET    /api/catalog',
          'GET    /api/catalog/categorias',
          'POST   /api/catalog/categorias',
          'GET    /api/products',
          'POST   /api/products',
          'GET    /api/services',
          'POST   /api/services',
        ],
        pipeline: [
          'GET    /api/opportunities',
          'GET    /api/opportunities/pipeline',
          'POST   /api/opportunities',
          'GET    /api/opportunities/:id',
          'POST   /api/opportunities/:id/status',
        ],
        propostas: [
          'GET    /api/quotes',
          'POST   /api/quotes',
          'GET    /api/quotes/:id',
          'GET    /api/quotes/:id/documento',
          'GET    /api/quotes/:id/whatsapp',
          'POST   /api/quotes/:id/status',
        ],
        acompanhamento: [
          'GET    /api/dashboard',
          'GET    /api/follow-ups/agenda',
          'GET    /api/follow-ups/recuperacao',
          'POST   /api/follow-ups/:id/status',
          'GET    /api/stats',
          'GET    /api/stats/uso-do-plano',
          'GET    /api/notifications',
          'GET    /api/sales',
          'POST   /api/sales',
        ],
        planos: ['GET /api/subscriptions/plans', 'GET /api/subscriptions/me'],
        ia: ['GET /api/ai/status', 'POST /api/ai/mensagem', 'POST /api/ai/proposta'],
      },
    },
  });
});

router.get('/health', asyncHandler(healthController.check));

/* -------------------------------- Conta -------------------------------- */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/companies', companyRoutes);
router.use('/subscriptions', subscriptionRoutes);

/* ------------------------------- Operacao ------------------------------ */
router.use('/dashboard', dashboardRoutes);
router.use('/clients', clientRoutes);
router.use('/catalog', catalogRoutes);
router.use('/products', productRoutes);
router.use('/services', serviceRoutes);
router.use('/opportunities', opportunityRoutes);
router.use('/quotes', quoteRoutes);
router.use('/sales', saleRoutes);
router.use('/follow-ups', followUpRoutes);
router.use('/stats', statsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/ai', aiRoutes);
router.use('/market', marketplaceRoutes);
router.use('/support', supportRoutes);

export { router as apiRoutes };
