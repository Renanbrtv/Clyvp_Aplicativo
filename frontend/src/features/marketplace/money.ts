/** Accept Brazilian money and an ungrouped decimal point; never silently turn 650.00 into 65000. */
export function amount(input: string): number | null {
  const value = input.trim();
  if (!value) return null;
  if (/^\d+(?:\.\d{1,2})?$/.test(value)) return Number(value);
  if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) return Number(value.replace(/\./g, ''));
  if (/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(value)) {
    return Number(value.replace(/\./g, '').replace(',', '.'));
  }
  return Number.NaN;
}
