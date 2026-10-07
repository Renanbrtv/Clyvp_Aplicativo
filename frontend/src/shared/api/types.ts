export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

/** Erro lancado pelo cliente HTTP - carrega o codigo estavel da API. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    status: number,
    code = 'UNKNOWN',
    details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = Array.isArray(details) ? details : undefined;
  }

  /** Mensagem de um campo especifico, para mostrar embaixo do input. */
  fieldError(field: string): string | undefined {
    return this.details?.find((item) => item.field === field)?.message;
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  avatarUrl: string | null;
  sellsType: string | null;
  mainGoal: string | null;
  onboardingCompleted: boolean;
  status: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface Company {
  id: number;
  legalName: string | null;
  tradeName: string | null;
  document: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  logoUrl: string | null;
  address: {
    zipCode: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
  };
  instagram: string | null;
  website: string | null;
}

export interface Settings {
  currency: string;
  locale: string;
  timezone: string;
  followUpDays: number;
  quoteValidityDays: number;
  defaultWarrantyDays: number | null;
  notificationsEnabled: boolean;
  whatsappSignature: string | null;
  theme: 'claro' | 'escuro' | 'sistema';
}

export interface PlanLimits {
  maxClients: number | null;
  maxOpportunitiesPerMonth: number | null;
  maxQuotesPerMonth: number | null;
  maxCatalogItems: number | null;
}

export interface PlanFeatures {
  customPdf: boolean;
  statistics: boolean;
  followUps: boolean;
  ai: boolean;
  team: boolean;
}

export interface FounderOffer {
  price: number | null;
  slots: number | null;
  slotsLeft: number;
  available: boolean;
}

export interface Plan {
  id: number;
  code: 'free' | 'pro' | 'pro_max';
  name: string;
  description: string | null;
  price: number;
  /** Preco de fundador enquanto houver vaga; senao, o preco cheio. */
  effectivePrice: number;
  founder: FounderOffer;
  billingPeriod: 'gratuito' | 'mensal' | 'anual';
  limits: PlanLimits;
  features: PlanFeatures;
}

export interface Subscription {
  id: number;
  status: string;
  isFounder: boolean;
  pricePaid: number | null;
  plan: {
    id: number;
    code: 'free' | 'pro' | 'pro_max';
    name: string;
    price: number;
    limits: PlanLimits;
    features: PlanFeatures;
  };
  usage?: PlanUsage | null;
}

export interface UpgradePreview {
  currentPlan: string | null;
  targetPlan: Plan;
  priceToday: number;
  keepsFounderPrice: boolean;
  checkoutReady: boolean;
  message: string;
}

export interface Account {
  user: User;
  company: Company | null;
  settings: Settings | null;
  subscription: Subscription | null;
}

export interface AuthResult {
  user: User;
  tokens: Tokens;
}

export interface DashboardSummary {
  user: { id: number; name: string; firstName: string };
  period: { month: number; year: number; label: string; previousLabel: string };
  sales: {
    total: number;
    count: number;
    previousTotal: number;
    variationPercent: number | null;
    weeklySeries: number[];
  };
  opportunities: {
    openTotal: number;
    openCount: number;
    negotiations: number;
    waitingResponse: number;
    byStatus: Array<{ status: string; label: string; count: number; total: number }>;
  };
  quotes: { pendingCount: number; pendingTotal: number };
  clients: { total: number; newThisMonth: number };
  needsAttention: Array<{
    opportunityId: number;
    clientId: number;
    clientName: string;
    whatsapp: string | null;
    title: string;
    amount: number;
    status: string;
    statusLabel: string;
    daysWithoutContact: number;
    quoteId: number | null;
    quoteNumber: number | null;
  }>;
  followUpDays: number;
}

/* ===================== Clientes, catalogo e pipeline ===================== */

export interface Client {
  id: number;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  document: string | null;
  address: {
    zipCode: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
  };
  notes: string | null;
  origin: string | null;
  totalPurchased: number;
  purchasesCount: number;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  type: 'produto' | 'servico';
  name: string;
  color: string | null;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  promoPrice: number | null;
  costPrice: number | null;
  trackStock: boolean;
  stock: number;
  photoUrl: string | null;
  notes: string | null;
  isActive: boolean;
  categoryId: number | null;
  categoryName: string | null;
}

export interface ServiceItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  estimatedTimeMinutes: number | null;
  warrantyDays: number | null;
  notes: string | null;
  isActive: boolean;
  categoryId: number | null;
  categoryName: string | null;
}

export type OpportunityStatus =
  | 'novo_contato'
  | 'proposta_enviada'
  | 'negociacao'
  | 'aguardando_pagamento'
  | 'fechado'
  | 'perdido';

export interface Opportunity {
  id: number;
  clientId: number;
  clientName: string;
  whatsapp: string | null;
  title: string;
  description: string | null;
  status: OpportunityStatus;
  statusLabel: string;
  source: string | null;
  totalAmount: number;
  expectedCloseDate: string | null;
  lastContactAt: string | null;
  daysWithoutContact: number;
  closedAt: string | null;
  lostReason: string | null;
  quoteId: number | null;
  quoteNumber: number | null;
  createdAt: string;
}

export interface PipelineColumn {
  status: OpportunityStatus;
  label: string;
  count: number;
  total: number;
  opportunities: Opportunity[];
}

export interface QuoteItem {
  id?: number;
  itemType: 'produto' | 'servico' | 'avulso';
  productId?: number | null;
  serviceId?: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total?: number;
}

export interface Quote {
  id: number;
  clientId: number;
  clientName: string;
  whatsapp: string | null;
  opportunityId: number | null;
  type: 'orcamento' | 'proposta';
  number: number;
  code: string;
  status: 'rascunho' | 'enviado' | 'visualizado' | 'aceito' | 'recusado' | 'expirado' | 'cancelado';
  statusLabel: string;
  subtotal: number;
  discountType: 'valor' | 'percentual';
  discountAmount: number;
  discountValue: number;
  total: number;
  deliveryTime: string | null;
  warranty: string | null;
  paymentMethods: string | null;
  validUntil: string | null;
  notes: string | null;
  sentAt: string | null;
  createdAt: string;
  items: QuoteItem[];
}

export interface QuoteDocument {
  quote: Quote;
  client: {
    id: number;
    name: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    document: string | null;
    city: string | null;
    state: string | null;
  } | null;
  company: {
    tradeName: string | null;
    legalName: string | null;
    document: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    logoUrl: string | null;
    city: string | null;
    state: string | null;
    instagram: string | null;
    website: string | null;
  } | null;
  branding: { showClyvoBrand: boolean; planCode: string };
}

export interface Sale {
  id: number;
  clientId: number;
  clientName: string;
  opportunityId: number | null;
  quoteId: number | null;
  description: string | null;
  amount: number;
  paymentMethod: string | null;
  soldAt: string;
}

export type FollowUpStatus =
  | 'pendente'
  | 'concluido'
  | 'adiado'
  | 'sem_resposta'
  | 'cliente_fechou'
  | 'cliente_recusou'
  | 'cancelado';

export interface FollowUp {
  id: number;
  clientId: number | null;
  clientName: string | null;
  whatsapp: string | null;
  opportunityId: number | null;
  opportunityTitle: string | null;
  opportunityAmount: number | null;
  quoteId: number | null;
  quoteNumber: number | null;
  type: string;
  typeLabel: string;
  title: string;
  notes: string | null;
  dueDate: string;
  status: FollowUpStatus;
  createdAt: string;
}

export interface FollowUpAgenda {
  counts: { atrasados: number; hoje: number; amanha: number; semana: number; pendentes: number; total: number };
  groups: Array<{ key: string; label: string; items: FollowUp[] }>;
}

export interface RecoveryItem {
  opportunityId: number;
  clientId: number;
  clientName: string;
  whatsapp: string | null;
  title: string;
  amount: number;
  status: string;
  daysWithoutContact: number;
  quoteId: number | null;
  quoteNumber: number | null;
  message: string;
  link: string | null;
}

export interface Results {
  period: { month: number; year: number; label: string; shortLabel: string };
  sales: { total: number; count: number; previousTotal: number; variationPercent: number | null; averageTicket: number };
  conversion: { rate: number; opportunities: number; closed: number; quoteRate: number };
  quotes: { sent: number; accepted: number; rejected: number; draft: number; expired: number };
  pipeline: {
    openTotal: number;
    openCount: number;
    byStatus: Array<{ status: string; label: string; count: number; total: number }>;
  };
  lost: { total: number; count: number };
  clients: { new: number; recurring: number; recurringRevenue: number };
  topProducts: Array<{ name: string; quantity: number; total: number }>;
  topServices: Array<{ name: string; quantity: number; total: number }>;
  monthlySeries: Array<{ period: string; label: string; total: number; count: number }>;
}

export interface PlanUsageEntry {
  used: number;
  limit: number | null;
  unlimited: boolean;
  remaining: number | null;
  reached: boolean;
}

export interface PlanUsage {
  planCode: string;
  planName: string;
  clientes: PlanUsageEntry;
  oportunidades: PlanUsageEntry;
  propostas: PlanUsageEntry;
  catalogo: PlanUsageEntry;
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
}

export interface WhatsappMessage {
  message: string;
  link: string | null;
  phone: string | null;
}

export interface Paginated<T> {
  items: T[];
  meta?: { page: number; perPage: number; total: number; totalPages: number; hasMore: boolean };
}
