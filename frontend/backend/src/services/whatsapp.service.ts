import { companyRepository } from '../repositories/company.repository';
import { settingsRepository } from '../repositories/settings.repository';

export type MessageKind =
  | 'primeiro_contato'
  | 'envio_orcamento'
  | 'negociacao'
  | 'follow_up'
  | 'recuperacao'
  | 'pos_venda'
  | 'garantia';

export interface MessageContext {
  clientName: string;
  quoteNumber?: number | null;
  quoteTotal?: number | null;
  itemsSummary?: string | null;
  deliveryTime?: string | null;
  warranty?: string | null;
  paymentMethods?: string | null;
  validDays?: number | null;
  daysWithoutContact?: number | null;
}

const currency = (value: number) =>
  `R$ ${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)}`;

const quoteCode = (n?: number | null) => (n ? `#${String(n).padStart(4, '0')}` : '');

/**
 * Monta as mensagens prontas do WhatsApp (Etapa 8).
 * Nao usamos a API oficial: o app abre https://wa.me/<numero>?text=<mensagem>.
 */
export const whatsappService = {
  async build(userId: number, kind: MessageKind, context: MessageContext): Promise<string> {
    const [company, settings] = await Promise.all([
      companyRepository.findByUserId(userId),
      settingsRepository.findByUserId(userId),
    ]);

    const signature = settings?.whatsapp_signature ?? company?.trade_name ?? '';
    const firstName = context.clientName.split(' ')[0];
    const body = buildBody(kind, firstName, context);

    return signature ? `${body}\n\n${signature}` : body;
  },

  /** Link pronto - o app tambem sabe montar, mas a API expoe para reuso. */
  link(phone: string | null | undefined, message: string): string | null {
    const digits = (phone ?? '').replace(/\D/g, '');
    if (digits.length < 10) return null;
    const withCountry = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
    return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
  },
};

function buildBody(kind: MessageKind, firstName: string, ctx: MessageContext): string {
  switch (kind) {
    case 'primeiro_contato':
      return (
        `Ola, ${firstName}! Tudo bem?\n\n` +
        'Recebi o seu contato e ja estou preparando tudo por aqui.\n' +
        'Me conta rapidinho o que voce precisa que eu te passo o orcamento hoje mesmo.'
      );

    case 'envio_orcamento': {
      const lines = [`Ola, ${firstName}! Tudo bem?`, '', 'Preparei sua proposta:', ''];
      if (ctx.quoteNumber) lines.push(`📋 Proposta ${quoteCode(ctx.quoteNumber)}`);
      if (ctx.itemsSummary) lines.push(`🔧 ${ctx.itemsSummary}`);
      if (ctx.quoteTotal !== null && ctx.quoteTotal !== undefined) {
        lines.push(`💰 Total: ${currency(ctx.quoteTotal)}`);
      }
      if (ctx.deliveryTime) lines.push(`⏱️ Prazo: ${ctx.deliveryTime}`);
      if (ctx.warranty) lines.push(`🛡️ Garantia: ${ctx.warranty}`);
      if (ctx.paymentMethods) lines.push(`💳 Pagamento: ${ctx.paymentMethods}`);
      if (ctx.validDays) lines.push(`📅 Validade: ${ctx.validDays} dias`);
      lines.push('', 'Qualquer duvida, estou a disposicao!');
      return lines.join('\n');
    }

    case 'negociacao':
      return (
        `Ola, ${firstName}!\n\n` +
        'Consegui rever os valores da sua proposta. Me diz o que ficaria melhor para voce ' +
        'que eu vejo o que da para ajustar.'
      );

    case 'follow_up':
      return (
        `Ola, ${firstName}! Tudo bem?\n\n` +
        'So passando para saber se ficou alguma duvida sobre o que conversamos.\n' +
        'Fico a disposicao!'
      );

    case 'recuperacao': {
      const quote = ctx.quoteNumber ? ` (proposta ${quoteCode(ctx.quoteNumber)})` : '';
      return (
        `Ola, ${firstName}! Tudo bem?\n\n` +
        `Passando para saber se conseguiu analisar a proposta que te enviei${quote}.\n\n` +
        'Caso tenha alguma duvida ou queira ajustar algum item, posso verificar para voce.\n\n' +
        'Fico a disposicao!'
      );
    }

    case 'pos_venda':
      return (
        `Ola, ${firstName}! Tudo bem?\n\n` +
        'Passando para saber se esta tudo certo por ai. Qualquer coisa que precisar, ' +
        'e so me chamar.'
      );

    case 'garantia':
      return (
        `Ola, ${firstName}! Tudo bem?\n\n` +
        'A garantia do servico que fiz para voce esta chegando ao fim.\n' +
        'Se quiser que eu de uma olhada antes de vencer, me avisa que eu agendo.'
      );

    default:
      return `Ola, ${firstName}! Tudo bem?`;
  }
}
