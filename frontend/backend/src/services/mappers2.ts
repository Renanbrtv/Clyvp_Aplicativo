import { OPPORTUNITY_STATUS_LABELS, type OpportunityStatus } from '../config/constants';
import type {
  CategoryRow,
  FollowUpRow,
  NotificationRow,
  OpportunityRow,
  ProductRow,
  QuoteItemRow,
  QuoteRow,
  SaleRow,
  ServiceRow,
} from '../types/models2';

const QUOTE_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  visualizado: 'Visualizado',
  aceito: 'Aceito',
  recusado: 'Recusado',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
};

const FOLLOW_UP_TYPE_LABELS: Record<string, string> = {
  contato: 'Entrar em contato',
  retorno: 'Retorno',
  recuperacao: 'Recuperar cliente',
  pos_venda: 'Pos-venda',
  garantia: 'Garantia',
  outro: 'Outro',
};

export function toPublicCategory(row: CategoryRow) {
  return { id: row.id, type: row.type, name: row.name, color: row.color };
}

export function toPublicProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sku: row.sku,
    price: Number(row.price),
    promoPrice: row.promo_price === null ? null : Number(row.promo_price),
    costPrice: row.cost_price === null ? null : Number(row.cost_price),
    trackStock: Boolean(row.track_stock),
    stock: row.stock,
    photoUrl: row.photo_url,
    notes: row.notes,
    isActive: Boolean(row.is_active),
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    createdAt: row.created_at,
  };
}

export function toPublicService(row: ServiceRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    estimatedTimeMinutes: row.estimated_time_minutes,
    warrantyDays: row.warranty_days,
    notes: row.notes,
    isActive: Boolean(row.is_active),
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    createdAt: row.created_at,
  };
}

export function toPublicOpportunity(row: OpportunityRow) {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name ?? '',
    whatsapp: row.client_whatsapp ?? row.client_phone ?? null,
    title: row.title,
    description: row.description,
    status: row.status,
    statusLabel: OPPORTUNITY_STATUS_LABELS[row.status as OpportunityStatus] ?? row.status,
    source: row.source,
    totalAmount: Number(row.total_amount),
    expectedCloseDate: row.expected_close_date,
    lastContactAt: row.last_contact_at,
    daysWithoutContact: Number(row.days_without_contact ?? 0),
    closedAt: row.closed_at,
    lostReason: row.lost_reason,
    quoteId: row.quote_id ?? null,
    quoteNumber: row.quote_number ?? null,
    createdAt: row.created_at,
  };
}

export function toPublicQuoteItem(row: QuoteItemRow) {
  return {
    id: row.id,
    itemType: row.item_type,
    productId: row.product_id,
    serviceId: row.service_id,
    description: row.description,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    discount: Number(row.discount),
    total: Number(row.total),
  };
}

export function toPublicQuote(row: QuoteRow, items: QuoteItemRow[] = []) {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name ?? '',
    whatsapp: row.client_whatsapp ?? row.client_phone ?? null,
    opportunityId: row.opportunity_id,
    type: row.type,
    number: row.number,
    code: `#${String(row.number).padStart(4, '0')}`,
    status: row.status,
    statusLabel: QUOTE_STATUS_LABELS[row.status] ?? row.status,
    subtotal: Number(row.subtotal),
    discountType: row.discount_type,
    discountAmount: Number(row.discount_amount),
    discountValue: Math.round((Number(row.subtotal) - Number(row.total)) * 100) / 100,
    total: Number(row.total),
    deliveryTime: row.delivery_time,
    warranty: row.warranty,
    paymentMethods: row.payment_methods,
    validUntil: row.valid_until,
    notes: row.notes,
    pdfUrl: row.pdf_url,
    sentAt: row.sent_at,
    acceptedAt: row.accepted_at,
    rejectedAt: row.rejected_at,
    createdAt: row.created_at,
    items: items.map(toPublicQuoteItem),
  };
}

export function toPublicSale(row: SaleRow) {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name ?? '',
    opportunityId: row.opportunity_id,
    quoteId: row.quote_id,
    description: row.description,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    soldAt: row.sold_at,
    notes: row.notes,
  };
}

export function toPublicFollowUp(row: FollowUpRow) {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name ?? null,
    whatsapp: row.client_whatsapp ?? null,
    opportunityId: row.opportunity_id,
    opportunityTitle: row.opportunity_title ?? null,
    opportunityAmount: row.opportunity_amount === null || row.opportunity_amount === undefined
      ? null
      : Number(row.opportunity_amount),
    quoteId: row.quote_id,
    quoteNumber: row.quote_number ?? null,
    type: row.type,
    typeLabel: FOLLOW_UP_TYPE_LABELS[row.type] ?? row.type,
    title: row.title,
    notes: row.notes,
    dueDate: row.due_date,
    status: row.status,
    completedAt: row.completed_at,
    snoozedUntil: row.snoozed_until,
    createdAt: row.created_at,
  };
}

export function toPublicNotification(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    payload: row.payload ?? null,
    actionUrl: row.action_url,
    read: row.read_at !== null,
    createdAt: row.created_at,
  };
}
