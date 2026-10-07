import type { QuoteDocument } from '../../shared/api/types';

const money = (value: number) =>
  `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;

const escape = (value: string | null | undefined): string =>
  (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * HTML da proposta (Etapa 7).
 * Vira PDF no proprio aparelho com expo-print - sem servidor e sem
 * servico externo. As cores seguem o design system.
 */
export function buildQuoteHtml(document: QuoteDocument): string {
  const { quote, client, company, branding } = document;

  const itemsRows = quote.items
    .map(
      (item) => `
      <tr>
        <td>
          <strong>${escape(item.description)}</strong>
          ${item.quantity > 1 ? `<div class="muted">${item.quantity} x ${money(item.unitPrice)}</div>` : ''}
        </td>
        <td class="right">${money(item.total ?? item.quantity * item.unitPrice - item.discount)}</td>
      </tr>`,
    )
    .join('');

  const details = [
    quote.deliveryTime ? ['Prazo', quote.deliveryTime] : null,
    quote.warranty ? ['Garantia', quote.warranty] : null,
    quote.paymentMethods ? ['Pagamento', quote.paymentMethods] : null,
    quote.validUntil ? ['Validade', new Date(quote.validUntil).toLocaleDateString('pt-BR')] : null,
  ]
    .filter(Boolean)
    .map((entry) => `<div class="detail"><span>${escape((entry as string[])[0])}</span><strong>${escape((entry as string[])[1])}</strong></div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Roboto, Arial, sans-serif;
    color: #111318; margin: 0; padding: 32px; font-size: 14px; line-height: 1.5;
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
  .brand { font-size: 26px; font-weight: 700; color: #FF7827; letter-spacing: -0.6px; }
  .company { font-size: 12px; color: #5A5B67; text-align: right; line-height: 1.6; }
  .doc-type { font-size: 12px; letter-spacing: 1.6px; text-transform: uppercase; color: #9799A5; margin-bottom: 2px; }
  .doc-code { font-size: 22px; font-weight: 700; }
  .section-title { font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: #9799A5; margin: 26px 0 8px; }
  .client-box { background: #FFF5EF; border-radius: 14px; padding: 16px; }
  .client-name { font-size: 17px; font-weight: 600; }
  .muted { color: #5A5B67; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 12px 0; border-bottom: 1px solid #EFEEF0; vertical-align: top; }
  .right { text-align: right; white-space: nowrap; font-weight: 600; }
  .totals { margin-top: 14px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; color: #5A5B67; }
  .grand { background: #FF7827; color: #fff; border-radius: 16px; padding: 16px 20px;
           display: flex; justify-content: space-between; align-items: center; margin-top: 14px; }
  .grand span { font-size: 13px; opacity: 0.9; }
  .grand strong { font-size: 26px; }
  .details { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
  .detail { background: #FFF5EF; border-radius: 12px; padding: 10px 14px; min-width: 130px; }
  .detail span { display: block; font-size: 11px; color: #9799A5; text-transform: uppercase; letter-spacing: 1px; }
  .notes { background: #FFF5EF; border-radius: 14px; padding: 16px; color: #5A5B67; }
  .footer { margin-top: 34px; padding-top: 16px; border-top: 1px solid #EFEEF0;
            font-size: 11px; color: #9799A5; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      ${!branding.showClyvoBrand && company?.logoUrl && /^https:\/\//i.test(company.logoUrl) ? `<img src="${escape(company.logoUrl)}" alt="Logo" style="max-width:160px;max-height:60px;margin-bottom:12px" />` : ''}
      <div class="brand">${escape(company?.tradeName || 'Clyvo')}</div>
      <div class="doc-type">${quote.type === 'proposta' ? 'Proposta' : 'Orcamento'}</div>
      <div class="doc-code">${escape(quote.code)}</div>
    </div>
    <div class="company">
      ${company?.legalName ? `${escape(company.legalName)}<br />` : ''}
      ${company?.document ? `CNPJ/CPF: ${escape(company.document)}<br />` : ''}
      ${company?.whatsapp ? `${escape(company.whatsapp)}<br />` : ''}
      ${company?.email ? `${escape(company.email)}<br />` : ''}
      ${company?.city ? `${escape(company.city)}${company.state ? ` - ${escape(company.state)}` : ''}` : ''}
    </div>
  </div>

  <div class="section-title">Cliente</div>
  <div class="client-box">
    <div class="client-name">${escape(client?.name ?? quote.clientName)}</div>
    <div class="muted">
      ${client?.whatsapp ? `${escape(client.whatsapp)} · ` : ''}
      ${client?.email ? `${escape(client.email)}` : ''}
      ${client?.city ? `<br />${escape(client.city)}${client.state ? ` - ${escape(client.state)}` : ''}` : ''}
    </div>
  </div>

  <div class="section-title">Itens</div>
  <table>${itemsRows}</table>

  <div class="totals">
    <div><span>Subtotal</span><span>${money(quote.subtotal)}</span></div>
    ${quote.discountValue > 0 ? `<div><span>Desconto</span><span>- ${money(quote.discountValue)}</span></div>` : ''}
  </div>

  <div class="grand">
    <span>Total</span>
    <strong>${money(quote.total)}</strong>
  </div>

  ${details ? `<div class="details">${details}</div>` : ''}

  ${quote.notes ? `<div class="section-title">Observacoes</div><div class="notes">${escape(quote.notes)}</div>` : ''}

  <div class="footer">
    ${escape(company?.tradeName || '')}
    ${company?.instagram ? ` · ${escape(company.instagram)}` : ''}
    ${company?.website ? ` · ${escape(company.website)}` : ''}
    ${branding.showClyvoBrand ? '<br />Proposta gerada com Clyvo · Transforme conversas em vendas.' : ''}
  </div>
</body>
</html>`;
}
