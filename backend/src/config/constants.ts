/**
 * Valores de dominio compartilhados entre banco, validadores e servicos.
 * Devem espelhar exatamente os ENUMs definidos em database/schema.sql.
 */

export const SELLS_TYPES = [
  'servicos',
  'produtos',
  'servicos_e_produtos',
  'vendedor',
  'loja',
  'outro',
] as const;
export type SellsType = (typeof SELLS_TYPES)[number];

export const MAIN_GOALS = [
  'organizar_clientes',
  'criar_orcamentos',
  'acompanhar_vendas',
  'nao_esquecer_clientes',
  'aumentar_vendas',
  'organizar_empresa',
] as const;
export type MainGoal = (typeof MAIN_GOALS)[number];

export const USER_STATUSES = ['ativo', 'inativo', 'bloqueado'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const OPPORTUNITY_STATUSES = [
  'novo_contato',
  'proposta_enviada',
  'negociacao',
  'aguardando_pagamento',
  'fechado',
  'perdido',
] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const QUOTE_TYPES = ['orcamento', 'proposta'] as const;
export type QuoteType = (typeof QUOTE_TYPES)[number];

export const QUOTE_STATUSES = [
  'rascunho',
  'enviado',
  'visualizado',
  'aceito',
  'recusado',
  'expirado',
  'cancelado',
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const FOLLOW_UP_STATUSES = [
  'pendente',
  'concluido',
  'adiado',
  'sem_resposta',
  'cliente_fechou',
  'cliente_recusou',
  'cancelado',
] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const PLAN_CODES = ['free', 'pro', 'pro_max'] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'ativa',
  'inadimplente',
  'cancelada',
  'expirada',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Rotulos amigaveis usados no app e nos PDFs. */
export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  novo_contato: 'Novo contato',
  proposta_enviada: 'Proposta enviada',
  negociacao: 'Negociacao',
  aguardando_pagamento: 'Aguardando pagamento',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

export const APP_NAME = 'Clyvo';
export const APP_TAGLINE = 'Transforme conversas em vendas.';
