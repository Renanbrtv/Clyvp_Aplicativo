import { api } from './client';
import type {
  AppNotification,
  Category,
  Client,
  FollowUp,
  FollowUpAgenda,
  Opportunity,
  PipelineColumn,
  PlanUsage,
  Plan,
  Product,
  Quote,
  QuoteDocument,
  QuoteItem,
  RecoveryItem,
  Results,
  Sale,
  ServiceItem,
  Subscription,
  UpgradePreview,
  WhatsappMessage,
} from './types';

const qs = (params: Record<string, string | number | boolean | undefined | null>): string => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (entries.length === 0) return '';
  return `?${entries.map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&')}`;
};

export type ClientFilter = 'todos' | 'recentes' | 'recorrentes' | 'sem_contato' | 'alto_valor';

export interface ClientPayload {
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  document?: string | null;
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  origin?: string | null;
}

export const clientsApi = {
  list: (params: { search?: string; filter?: ClientFilter; page?: number } = {}) =>
    api.get<{ clients: Client[] }>(`/clients${qs(params)}`),

  detail: (id: number) =>
    api.get<{ client: Client; opportunities: Opportunity[]; quotes: Quote[]; sales: Sale[] }>(`/clients/${id}`),

  create: (payload: ClientPayload) => api.post<{ client: Client }>('/clients', payload),

  update: (id: number, payload: Partial<ClientPayload>) =>
    api.patch<{ client: Client }>(`/clients/${id}`, payload),

  remove: (id: number) => api.delete<null>(`/clients/${id}`),

  registerContact: (id: number) => api.post<{ client: Client }>(`/clients/${id}/contato`),

  whatsapp: (id: number, kind = 'primeiro_contato') =>
    api.get<WhatsappMessage>(`/clients/${id}/whatsapp${qs({ kind })}`),
};

export interface ProductPayload {
  name: string;
  description?: string | null;
  sku?: string | null;
  price: number;
  promoPrice?: number | null;
  trackStock?: boolean;
  stock?: number;
  categoryId?: number | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface ServicePayload {
  name: string;
  description?: string | null;
  price: number;
  estimatedTimeMinutes?: number | null;
  warrantyDays?: number | null;
  categoryId?: number | null;
  notes?: string | null;
  isActive?: boolean;
}

export const catalogApi = {
  full: (search?: string) =>
    api.get<{ products: Product[]; services: ServiceItem[] }>(`/catalog${qs({ search })}`),

  categories: (type?: 'produto' | 'servico') =>
    api.get<{ categories: Category[] }>(`/catalog/categorias${qs({ type })}`),

  createCategory: (type: 'produto' | 'servico', name: string) =>
    api.post<{ category: Category }>('/catalog/categorias', { type, name }),

  listProducts: (search?: string) => api.get<{ products: Product[] }>(`/products${qs({ search })}`),
  getProduct: (id: number) => api.get<{ product: Product }>(`/products/${id}`),
  createProduct: (payload: ProductPayload) => api.post<{ product: Product }>('/products', payload),
  updateProduct: (id: number, payload: Partial<ProductPayload>) =>
    api.patch<{ product: Product }>(`/products/${id}`, payload),
  removeProduct: (id: number) => api.delete<null>(`/products/${id}`),

  listServices: (search?: string) => api.get<{ services: ServiceItem[] }>(`/services${qs({ search })}`),
  getService: (id: number) => api.get<{ service: ServiceItem }>(`/services/${id}`),
  createService: (payload: ServicePayload) => api.post<{ service: ServiceItem }>('/services', payload),
  updateService: (id: number, payload: Partial<ServicePayload>) =>
    api.patch<{ service: ServiceItem }>(`/services/${id}`, payload),
  removeService: (id: number) => api.delete<null>(`/services/${id}`),
};

export interface OpportunityPayload {
  clientId?: number;
  newClient?: { name: string; phone?: string | null; whatsapp?: string | null };
  title: string;
  description?: string | null;
  status?: string;
  source?: string | null;
  totalAmount?: number;
  expectedCloseDate?: string | null;
}

export interface ChangeStatusPayload {
  status: string;
  note?: string | null;
  lostReason?: string | null;
  registerSale?: boolean;
  amount?: number;
  paymentMethod?: string | null;
}

interface OpportunityDetail {
  opportunity: Opportunity;
  quotes: Quote[];
  history: Array<{ id: number; fromStatus: string | null; toStatus: string; note: string | null; createdAt: string }>;
}

export const opportunitiesApi = {
  list: (params: { status?: string; clientId?: number; search?: string; open?: boolean } = {}) =>
    api.get<{ opportunities: Opportunity[] }>(`/opportunities${qs(params)}`),

  pipeline: () =>
    api.get<{ columns: PipelineColumn[]; totals: { open: number; count: number } }>('/opportunities/pipeline'),

  detail: (id: number) => api.get<OpportunityDetail>(`/opportunities/${id}`),

  create: (payload: OpportunityPayload) => api.post<OpportunityDetail>('/opportunities', payload),

  update: (id: number, payload: Partial<OpportunityPayload>) =>
    api.patch<OpportunityDetail>(`/opportunities/${id}`, payload),

  changeStatus: (id: number, payload: ChangeStatusPayload) =>
    api.post<OpportunityDetail>(`/opportunities/${id}/status`, payload),

  registerContact: (id: number) => api.post<OpportunityDetail>(`/opportunities/${id}/contato`),

  remove: (id: number) => api.delete<null>(`/opportunities/${id}`),
};

export interface QuotePayload {
  clientId: number;
  opportunityId?: number | null;
  type: 'orcamento' | 'proposta';
  discountType?: 'valor' | 'percentual';
  discountAmount?: number;
  deliveryTime?: string | null;
  warranty?: string | null;
  paymentMethods?: string | null;
  validUntil?: string | null;
  notes?: string | null;
  items: Array<Omit<QuoteItem, 'id' | 'total'>>;
}

export const quotesApi = {
  list: (params: { status?: string; clientId?: number; pending?: boolean } = {}) =>
    api.get<{ quotes: Quote[] }>(`/quotes${qs(params)}`),

  detail: (id: number) => api.get<{ quote: Quote }>(`/quotes/${id}`),

  document: (id: number) => api.get<QuoteDocument>(`/quotes/${id}/documento`),

  create: (payload: QuotePayload) => api.post<{ quote: Quote }>('/quotes', payload),

  update: (id: number, payload: Partial<QuotePayload>) => api.patch<{ quote: Quote }>(`/quotes/${id}`, payload),

  changeStatus: (id: number, status: string, note?: string) =>
    api.post<{ quote: Quote }>(`/quotes/${id}/status`, { status, note }),

  whatsapp: (id: number) => api.get<WhatsappMessage>(`/quotes/${id}/whatsapp`),

  remove: (id: number) => api.delete<null>(`/quotes/${id}`),
};

export const salesApi = {
  list: (params: { clientId?: number; month?: string } = {}) =>
    api.get<{ sales: Sale[]; totalAmount: number }>(`/sales${qs(params)}`),

  create: (payload: {
    clientId: number;
    opportunityId?: number | null;
    quoteId?: number | null;
    description?: string | null;
    amount: number;
    paymentMethod?: string | null;
  }) => api.post<{ sale: Sale }>('/sales', payload),

  remove: (id: number) => api.delete<null>(`/sales/${id}`),
};

export const followUpsApi = {
  agenda: () => api.get<FollowUpAgenda>('/follow-ups/agenda'),

  list: (period?: string) => api.get<{ followUps: FollowUp[] }>(`/follow-ups${qs({ period })}`),

  recovery: () =>
    api.get<{ followUpDays: number; totalAtRisk: number; items: RecoveryItem[] }>('/follow-ups/recuperacao'),

  create: (payload: {
    clientId?: number | null;
    opportunityId?: number | null;
    type: string;
    title: string;
    notes?: string | null;
    dueDate: string;
  }) => api.post<{ followUp: FollowUp }>('/follow-ups', payload),

  updateStatus: (id: number, status: string, snoozedUntil?: string) =>
    api.post<{ followUp: FollowUp }>(`/follow-ups/${id}/status`, { status, snoozedUntil }),

  whatsapp: (id: number) => api.get<WhatsappMessage>(`/follow-ups/${id}/whatsapp`),

  remove: (id: number) => api.delete<null>(`/follow-ups/${id}`),
};

export const statsApi = {
  results: (month?: string) => api.get<Results>(`/stats${qs({ month })}`),
  usage: () => api.get<{ usage: PlanUsage | null }>('/stats/uso-do-plano'),
};

export const notificationsApi = {
  list: () => api.get<{ notifications: AppNotification[]; unreadCount: number }>('/notifications'),
  refresh: () => api.post<{ notifications: AppNotification[]; unreadCount: number }>('/notifications/atualizar'),
  markAsRead: (id: number) => api.post<null>(`/notifications/${id}/ler`),
  markAllAsRead: () => api.post<{ updated: number }>('/notifications/ler-todas'),
  remove: (id: number) => api.delete<null>(`/notifications/${id}`),
};

export const aiApi = {
  status: () =>
    api.get<{ configured: boolean; provider: string | null; features: Record<string, boolean> }>('/ai/status'),
  message: (kind: string, clientId?: number) =>
    api.post<{ message: string; link: string | null }>('/ai/mensagem', { kind, clientId }),
};

export const plansApi = {
  list: () => api.get<{ plans: Plan[] }>('/subscriptions/plans'),
  current: () => api.get<{ subscription: Subscription }>('/subscriptions/me'),
  previewUpgrade: (planCode: 'free' | 'pro' | 'pro_max') =>
    api.post<UpgradePreview>('/subscriptions/upgrade', { planCode }),
};
