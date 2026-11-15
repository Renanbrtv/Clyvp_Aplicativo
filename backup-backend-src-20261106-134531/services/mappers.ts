import type {
  CompanyRow,
  PlanRow,
  PublicCompany,
  PublicUser,
  SettingsRow,
  UserRow,
} from '../types/models';
import type { SubscriptionWithPlanRow } from '../repositories/subscription.repository';

/** Converte a linha do banco no objeto publico da API (sem password_hash). */
export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    avatarUrl: row.avatar_url,
    sellsType: row.sells_type,
    mainGoal: row.main_goal,
    onboardingCompleted: Boolean(row.onboarding_completed),
    status: row.status,
    emailVerified: row.email_verified_at !== null,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPublicCompany(row: CompanyRow): PublicCompany {
  return {
    id: row.id,
    legalName: row.legal_name,
    tradeName: row.trade_name,
    document: row.document,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    logoUrl: row.logo_url,
    address: {
      zipCode: row.zip_code,
      street: row.street,
      number: row.number,
      complement: row.complement,
      district: row.district,
      city: row.city,
      state: row.state,
    },
    instagram: row.instagram,
    website: row.website,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPublicSettings(row: SettingsRow) {
  return {
    currency: row.currency,
    locale: row.locale,
    timezone: row.timezone,
    followUpDays: row.follow_up_days,
    quoteValidityDays: row.quote_validity_days,
    defaultWarrantyDays: row.default_warranty_days,
    notificationsEnabled: Boolean(row.notifications_enabled),
    whatsappSignature: row.whatsapp_signature,
    theme: row.theme,
    updatedAt: row.updated_at,
  };
}

export function toPublicPlan(row: PlanRow, foundersTaken = 0) {
  const founderPrice = row.founder_price === null ? null : Number(row.founder_price);
  const founderSlots = row.founder_slots === null ? null : Number(row.founder_slots);
  const slotsLeft = founderSlots === null ? 0 : Math.max(0, founderSlots - foundersTaken);
  const founderAvailable = founderPrice !== null && slotsLeft > 0;

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    /** O que o usuario paga hoje: preco de fundador enquanto houver vaga. */
    effectivePrice: founderAvailable ? (founderPrice as number) : Number(row.price),
    founder: {
      price: founderPrice,
      slots: founderSlots,
      slotsLeft,
      available: founderAvailable,
    },
    billingPeriod: row.billing_period,
    limits: {
      maxClients: row.max_clients,
      maxOpportunitiesPerMonth: row.max_opportunities_per_month,
      maxQuotesPerMonth: row.max_quotes_per_month,
      maxCatalogItems: row.max_catalog_items,
    },
    features: {
      customPdf: Boolean(row.has_custom_pdf),
      statistics: Boolean(row.has_statistics),
      followUps: Boolean(row.has_follow_ups),
      ai: Boolean(row.has_ai),
      team: Boolean(row.has_team),
    },
  };
}

export function toPublicSubscription(row: SubscriptionWithPlanRow) {
  return {
    id: row.id,
    status: row.status,
    isFounder: Boolean(row.is_founder),
    pricePaid: row.price_paid === null ? null : Number(row.price_paid),
    startedAt: row.started_at,
    currentPeriodEnd: row.current_period_end,
    trialEndsAt: row.trial_ends_at,
    plan: {
      id: row.plan_id,
      code: row.plan_code,
      name: row.plan_name,
      price: Number(row.plan_price),
      limits: {
        maxClients: row.max_clients,
        maxOpportunitiesPerMonth: row.max_opportunities_per_month,
        maxQuotesPerMonth: row.max_quotes_per_month,
        maxCatalogItems: row.max_catalog_items,
      },
      features: {
        customPdf: Boolean(row.has_custom_pdf),
        statistics: Boolean(row.has_statistics),
        followUps: Boolean(row.has_follow_ups),
        ai: Boolean(row.has_ai),
        team: Boolean(row.has_team),
      },
    },
  };
}
