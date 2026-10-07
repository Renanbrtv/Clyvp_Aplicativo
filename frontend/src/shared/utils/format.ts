/** Formatacao em portugues do Brasil, sem depender de bibliotecas externas. */

/** 8450 -> "R$ 8.450" | 8450.9 -> "R$ 8.450,90" */
export function currency(value: number, options: { cents?: boolean } = {}): string {
  const showCents = options.cents ?? !Number.isInteger(value);
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(value);

  return `R$ ${formatted}`;
}

/** 8450 -> "8.450" */
export function number(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

/** 28 -> "+28%" | -12 -> "-12%" */
export function percent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${String(rounded).replace('.', ',')}%`;
}

/** 0 -> "hoje" | 1 -> "ontem" | 3 -> "ha 3 dias" */
export function relativeDays(days: number): string {
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `ha ${days} dias`;
}

/** "Aguardando resposta ha 3 dias" */
export function waitingLabel(days: number): string {
  if (days <= 0) return 'Aguardando resposta desde hoje';
  if (days === 1) return 'Aguardando resposta ha 1 dia';
  return `Aguardando resposta ha ${days} dias`;
}

/** "(62) 99999-1234" */
export function phone(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value;
}

/** Remove tudo que nao for digito - usado antes de enviar para a API. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Link do WhatsApp com a mensagem ja pronta. */
export function whatsappLink(rawPhone: string | null | undefined, message: string): string | null {
  const digits = onlyDigits(rawPhone ?? '');
  if (digits.length < 10) return null;

  const withCountry = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}
