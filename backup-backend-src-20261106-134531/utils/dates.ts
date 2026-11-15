/** Converte Date para o formato aceito pelo MySQL (DATETIME). */
export function toMysqlDateTime(date: Date): string {
  const pad = (value: number, size = 2) => String(value).padStart(size, '0');
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function isPast(date: Date | string | null | undefined): boolean {
  if (!date) return true;
  const value = date instanceof Date ? date : new Date(date);
  return value.getTime() <= Date.now();
}
