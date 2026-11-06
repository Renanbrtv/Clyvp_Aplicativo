/** Cortesia administrativa explícita, sem alterar recursos ou identificar avaliadores. */
export const REVIEW_PROVIDER = 'complimentary_review';
export function hasReviewAccess(row: {
  [key: string]: unknown; external_provider?: unknown; status?: unknown; plan_code?: unknown;
} | null): boolean {
  return row?.external_provider === REVIEW_PROVIDER &&
    row.status === 'ativa' && row.plan_code === 'pro_max';
}
