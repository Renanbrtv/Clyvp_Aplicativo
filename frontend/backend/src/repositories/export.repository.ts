import { query, type RowDataPacket } from '../config/database';
const TABLES = ['companies', 'settings', 'clients', 'categories', 'products', 'services',
  'opportunities', 'opportunity_status_history', 'quotes', 'quote_items', 'quote_status_history',
  'sales', 'follow_ups', 'notifications'] as const;
export const exportRepository = {
  async all(userId: number) {
    const result: Record<string, RowDataPacket[]> = {};
    for (const table of TABLES) {
      // Table names are a fixed whitelist; user data always goes into parameters.
      result[table] = await query<RowDataPacket>(`SELECT * FROM ${table} WHERE user_id = ? ORDER BY id`, [userId]);
    }
    result.cly_usage = await query<RowDataPacket>('SELECT consent_version, consent_at, month_key, monthly_used, round_used, level, blocked_until, last_exhausted_at FROM cly_usage WHERE user_id=?', [userId]);
    for (const table of ['market_preferences','market_profiles','market_goals','market_views','market_blocks']) result[table] = await query<RowDataPacket>(`SELECT * FROM ${table} WHERE user_id=?`,[userId]);
    result.market_posts = await query<RowDataPacket>('SELECT * FROM market_posts WHERE owner_id=?',[userId]);
    result.market_proposals = await query<RowDataPacket>('SELECT * FROM market_proposals WHERE professional_id=?',[userId]);
    result.market_works = await query<RowDataPacket>('SELECT * FROM market_works WHERE customer_id=? OR professional_id=?',[userId,userId]);
    result.market_messages = await query<RowDataPacket>('SELECT * FROM market_messages WHERE sender_id=?',[userId]);
    result.market_reviews = await query<RowDataPacket>('SELECT * FROM market_reviews WHERE author_id=?',[userId]);
    result.market_reports = await query<RowDataPacket>('SELECT id,target_type,target_id,reason,status,created_at FROM market_reports WHERE reporter_id=?',[userId]);
    return result;
  },
};
