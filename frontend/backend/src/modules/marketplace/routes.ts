import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { authenticate, requireUser } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { asyncHandler, sendSuccess } from '../../utils/http';
import { AppError } from '../../utils/app-error';
import { marketService as s } from './service';
import {
  profileSchema,
  postSchema,
  proposalSchema,
  preferencesSchema,
  goalSchema,
  reportSchema,
  termsSchema,
} from './validation';
const router = Router();
router.use(authenticate);
const write = rateLimit({
  windowMs: 60000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(requireUser(req).id),
  message: {
    success: false,
    error: { code: 'MARKET_RATE_LIMIT', message: 'Muitas alteracoes. Aguarde um minuto.' },
  },
});
router.use((req, res, next) => (req.method === 'GET' ? next() : write(req, res, next)));
const id = (v: unknown) => {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 1) throw AppError.badRequest('Identificador invalido.');
  return n;
};
const run = (fn: (uid: number, req: any) => Promise<any>) =>
  asyncHandler(async (req, res) => sendSuccess(res, await fn(requireUser(req).id, req)));
router.get(
  '/me',
  run((uid) => s.me(uid)),
);
router.post(
  '/preferences',
  validate(preferencesSchema),
  run((uid, r) => s.preferences(uid, r.body)),
);
router.post(
  '/profile',
  validate(profileSchema),
  run((uid, r) => s.saveProfile(uid, r.body)),
);
router.get(
  '/profiles',
  validate(
    z.object({
      search: z.string().max(100).default(''),
      page: z.coerce.number().int().min(1).max(100).default(1),
    }),
    'query',
  ),
  run((uid, r) => s.professionals(uid, r.query.search, r.query.page)),
);
router.get(
  '/profiles/:id',
  run((uid, r) => s.profile(uid, id(r.params.id))),
);
const list = z
  .object({
    category: z.string().max(80).optional(),
    mode: z.enum(['presencial', 'remoto']).optional(),
    city: z.string().max(100).optional(),
    min: z.coerce.number().min(0).optional(),
    max: z.coerce.number().min(0).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    distance: z.coerce.number().min(1).max(20000).optional(),
    sort: z.enum(['recentes', 'proximas']).default('recentes'),
    page: z.coerce.number().int().min(1).max(100).default(1),
  })
  .strict();
router.get(
  '/posts',
  validate(list, 'query'),
  run((uid, r) => s.posts(uid, r.query)),
);
router.post(
  '/posts',
  validate(postSchema),
  run((uid, r) => s.createPost(uid, r.body)),
);
router.get(
  '/posts/:id',
  run((uid, r) => s.post(uid, id(r.params.id))),
);
router.post(
  '/posts/:id/cancel',
  run((uid, r) => s.cancelPost(uid, id(r.params.id))),
);
router.post(
  '/posts/:id/proposals',
  validate(proposalSchema),
  run((uid, r) => s.propose(uid, id(r.params.id), r.body)),
);
router.post(
  '/proposals/:id/withdraw',
  run((uid, r) => s.withdraw(uid, id(r.params.id))),
);
router.post(
  '/proposals/:id/accept',
  run((uid, r) => s.accept(uid, id(r.params.id))),
);
router.get(
  '/mine',
  run((uid) => s.mine(uid)),
);
router.get(
  '/works/:id',
  validate(z.object({ after: z.coerce.number().int().min(0).default(0) }), 'query'),
  run((uid, r) => s.work(uid, id(r.params.id), r.query.after)),
);
router.post(
  '/works/:id/messages',
  validate(z.object({ message: z.string().trim().min(1).max(2000) }).strict()),
  run((uid, r) => s.message(uid, id(r.params.id), r.body.message)),
);
router.post(
  '/works/:id/terms',
  validate(termsSchema),
  run((uid, r) => s.terms(uid, id(r.params.id), r.body)),
);
router.post(
  '/works/:id/terms/accept',
  run((uid, r) => s.acceptTerms(uid, id(r.params.id))),
);
router.post(
  '/works/:id/terms/discard',
  run((uid, r) => s.discardTerms(uid, id(r.params.id))),
);
router.post(
  '/works/:id/complete',
  run((uid, r) => s.complete(uid, id(r.params.id))),
);
router.post(
  '/works/:id/cancel',
  run((uid, r) => s.cancelWork(uid, id(r.params.id))),
);
router.post(
  '/works/:id/import',
  run((uid, r) => s.importClient(uid, id(r.params.id))),
);
router.post(
  '/works/:id/received',
  run((uid, r) => s.received(uid, id(r.params.id))),
);
router.post(
  '/works/:id/reviews',
  validate(
    z.object({ stars: z.number().int().min(1).max(5), comment: z.string().trim().max(1000) }).strict(),
  ),
  run((uid, r) => s.review(uid, id(r.params.id), r.body.stars, r.body.comment)),
);
router.get(
  '/blocks',
  run((uid) => s.blocks(uid)),
);
router.post(
  '/blocks',
  validate(z.object({ targetId: z.number().int().positive(), enabled: z.boolean() }).strict()),
  run((uid, r) => s.block(uid, r.body.targetId, r.body.enabled)),
);
router.post(
  '/reports',
  validate(reportSchema),
  run((uid, r) => s.report(uid, r.body)),
);
router.get(
  '/moderation',
  run((uid) => s.moderation(uid)),
);
router.get(
  '/moderation/:id',
  run((uid, r) => s.reportContent(uid, id(r.params.id))),
);
router.post(
  '/moderation/:id/resolve',
  validate(
    z.object({ action: z.enum(['ocultar', 'arquivar']), note: z.string().trim().min(5).max(450) }).strict(),
  ),
  run((uid, r) => s.resolve(uid, id(r.params.id), r.body)),
);
router.post(
  '/moderation/users/:id/restore',
  run((uid, r) => s.restoreUser(uid, id(r.params.id))),
);
router.post(
  '/goals',
  validate(goalSchema),
  run((uid, r) => s.goal(uid, r.body)),
);
router.get(
  '/earnings',
  validate(
    z.object({
      month: z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
        .optional(),
    }),
    'query',
  ),
  run((uid, r) => s.earnings(uid, r.query.month)),
);
router.get(
  '/summary',
  run((uid) => s.summary(uid)),
);
export { router as marketplaceRoutes };
