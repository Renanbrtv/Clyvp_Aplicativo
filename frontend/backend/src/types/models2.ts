import type { RowDataPacket } from 'mysql2/promise';

import type { FollowUpStatus, OpportunityStatus, QuoteStatus, QuoteType } from '../config/constants';

export interface ClientRow extends RowDataPacket {
  id: number;
  user_id: number;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  document: string | null;
  zip_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  origin: string | null;
  total_purchased: number;
  purchases_count: number;
  last_contact_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CategoryRow extends RowDataPacket {
  id: number;
  user_id: number;
  type: 'produto' | 'servico';
  name: string;
  color: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProductRow extends RowDataPacket {
  id: number;
  user_id: number;
  category_id: number | null;
  category_name?: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  promo_price: number | null;
  cost_price: number | null;
  track_stock: number;
  stock: number;
  photo_url: string | null;
  notes: string | null;
  is_active: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface ServiceRow extends RowDataPacket {
  id: number;
  user_id: number;
  category_id: number | null;
  category_name?: string | null;
  name: string;
  description: string | null;
  price: number;
  estimated_time_minutes: number | null;
  warranty_days: number | null;
  notes: string | null;
  is_active: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface OpportunityRow extends RowDataPacket {
  id: number;
  user_id: number;
  client_id: number;
  client_name?: string;
  client_whatsapp?: string | null;
  client_phone?: string | null;
  title: string;
  description: string | null;
  status: OpportunityStatus;
  source: string | null;
  total_amount: number;
  expected_close_date: Date | null;
  last_contact_at: Date | null;
  closed_at: Date | null;
  lost_reason: string | null;
  quote_id?: number | null;
  quote_number?: number | null;
  days_without_contact?: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface OpportunityHistoryRow extends RowDataPacket {
  id: number;
  from_status: OpportunityStatus | null;
  to_status: OpportunityStatus;
  note: string | null;
  created_at: Date;
}

export interface QuoteRow extends RowDataPacket {
  id: number;
  user_id: number;
  client_id: number;
  client_name?: string;
  client_whatsapp?: string | null;
  client_phone?: string | null;
  opportunity_id: number | null;
  type: QuoteType;
  number: number;
  status: QuoteStatus;
  subtotal: number;
  discount_type: 'valor' | 'percentual';
  discount_amount: number;
  total: number;
  delivery_time: string | null;
  warranty: string | null;
  payment_methods: string | null;
  valid_until: Date | null;
  notes: string | null;
  pdf_url: string | null;
  sent_at: Date | null;
  viewed_at: Date | null;
  accepted_at: Date | null;
  rejected_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface QuoteItemRow extends RowDataPacket {
  id: number;
  quote_id: number;
  item_type: 'produto' | 'servico' | 'avulso';
  product_id: number | null;
  service_id: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  sort_order: number;
}

export interface SaleRow extends RowDataPacket {
  id: number;
  user_id: number;
  client_id: number;
  client_name?: string;
  opportunity_id: number | null;
  quote_id: number | null;
  description: string | null;
  amount: number;
  payment_method: string | null;
  sold_at: Date;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface FollowUpRow extends RowDataPacket {
  id: number;
  user_id: number;
  client_id: number | null;
  client_name?: string | null;
  client_whatsapp?: string | null;
  opportunity_id: number | null;
  opportunity_title?: string | null;
  opportunity_amount?: number | null;
  quote_id: number | null;
  quote_number?: number | null;
  type: 'contato' | 'retorno' | 'recuperacao' | 'pos_venda' | 'garantia' | 'outro';
  title: string;
  notes: string | null;
  due_date: Date;
  status: FollowUpStatus;
  completed_at: Date | null;
  snoozed_until: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationRow extends RowDataPacket {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  payload: unknown;
  action_url: string | null;
  read_at: Date | null;
  created_at: Date;
}
