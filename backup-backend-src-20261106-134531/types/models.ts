import type { RowDataPacket } from 'mysql2/promise';

import type {
  MainGoal,
  PlanCode,
  SellsType,
  SubscriptionStatus,
  UserStatus,
} from '../config/constants';

/** Linha da tabela `users`. password_hash nunca sai da camada de servico. */
export interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  sells_type: SellsType | null;
  main_goal: MainGoal | null;
  onboarding_completed: number;
  status: UserStatus;
  email_verified_at: Date | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/** Usuario seguro para exposicao na API (sem hash de senha). */
export interface PublicUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  avatarUrl: string | null;
  sellsType: SellsType | null;
  mainGoal: MainGoal | null;
  onboardingCompleted: boolean;
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyRow extends RowDataPacket {
  id: number;
  user_id: number;
  legal_name: string | null;
  trade_name: string | null;
  document: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  logo_url: string | null;
  zip_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  instagram: string | null;
  website: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PublicCompany {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanRow extends RowDataPacket {
  id: number;
  code: PlanCode;
  name: string;
  description: string | null;
  price: number;
  founder_price: number | null;
  founder_slots: number | null;
  billing_period: 'mensal' | 'anual' | 'gratuito';
  max_clients: number | null;
  max_opportunities_per_month: number | null;
  max_quotes_per_month: number | null;
  max_catalog_items: number | null;
  has_custom_pdf: number;
  has_statistics: number;
  has_follow_ups: number;
  has_ai: number;
  has_team: number;
  is_active: number;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionRow extends RowDataPacket {
  id: number;
  user_id: number;
  plan_id: number;
  status: SubscriptionStatus;
  is_founder: number;
  price_paid: number | null;
  started_at: Date;
  current_period_start: Date | null;
  current_period_end: Date | null;
  trial_ends_at: Date | null;
  canceled_at: Date | null;
  external_provider: string | null;
  external_subscription_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SettingsRow extends RowDataPacket {
  id: number;
  user_id: number;
  currency: string;
  locale: string;
  timezone: string;
  follow_up_days: number;
  quote_validity_days: number;
  default_warranty_days: number | null;
  notifications_enabled: number;
  whatsapp_signature: string | null;
  theme: 'claro' | 'escuro' | 'sistema';
  created_at: Date;
  updated_at: Date;
}

export interface RefreshTokenRow extends RowDataPacket {
  id: number;
  user_id: number;
  token_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: Date;
}

export interface PasswordResetTokenRow extends RowDataPacket {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface CountRow extends RowDataPacket {
  total: number;
}
