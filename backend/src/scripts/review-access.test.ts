import assert from 'node:assert/strict';
import { hasReviewAccess, REVIEW_PROVIDER } from '../services/review-access';

assert.equal(hasReviewAccess(null), false);
for (const provider of [null, '', 'revenuecat', 'play_store']) {
  assert.equal(hasReviewAccess({ external_provider: provider, status: 'ativa', plan_code: 'pro_max' }), false);
}
for (const status of ['cancelada', 'expirada', 'trialing', 'inadimplente']) {
  assert.equal(hasReviewAccess({ external_provider: REVIEW_PROVIDER, status, plan_code: 'pro_max' }), false);
}
for (const plan_code of ['free', 'pro']) {
  assert.equal(hasReviewAccess({ external_provider: REVIEW_PROVIDER, status: 'ativa', plan_code }), false);
}
assert.equal(hasReviewAccess({ external_provider: REVIEW_PROVIDER, status: 'ativa', plan_code: 'pro_max' }), true);
console.log('12 verificações de elegibilidade aprovadas.');
