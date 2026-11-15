import { z } from 'zod';

import { PLAN_CODES } from '../config/constants';

export const upgradeSchema = z
  .object({
    planCode: z.enum(PLAN_CODES),
  })
  .strict();
