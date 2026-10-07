/** Accept BR decimal comma and the decimal dot returned by the API. */
export function parseDecimal(value: string): number {
  const cleaned = value.trim().replace(/\s/g, '');
  if (!cleaned) return 0;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}
