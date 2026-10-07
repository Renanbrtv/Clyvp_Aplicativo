import type { AuthenticatedUser } from './auth';

/**
 * Adiciona req.user ao Express.
 * Preenchido exclusivamente pelo middleware `authenticate`.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
