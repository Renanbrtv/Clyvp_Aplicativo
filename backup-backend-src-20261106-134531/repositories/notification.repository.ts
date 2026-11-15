import { execute, query, queryOne } from '../config/database';
import type { CountRow } from '../types/models';
import type { NotificationRow } from '../types/models2';

export interface NotificationInput {
  type: string;
  title: string;
  message: string;
  payload?: Record<string, unknown> | null;
  actionUrl?: string | null;
}

export const notificationRepository = {
  async list(userId: number, onlyUnread = false, limit = 50): Promise<NotificationRow[]> {
    const where = onlyUnread ? 'user_id = ? AND read_at IS NULL' : 'user_id = ?';
    return query<NotificationRow>(
      `SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT ?`,
      [userId, limit],
    );
  },

  async unreadCount(userId: number): Promise<number> {
    const row = await queryOne<CountRow>(
      'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND read_at IS NULL',
      [userId],
    );
    return row?.total ?? 0;
  },

  async create(userId: number, input: NotificationInput): Promise<number> {
    const result = await execute(
      `INSERT INTO notifications (user_id, type, title, message, payload, action_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        input.type,
        input.title,
        input.message,
        input.payload ? JSON.stringify(input.payload) : null,
        input.actionUrl ?? null,
      ],
    );
    return result.insertId;
  },

  /** Evita repetir o mesmo aviso no mesmo dia. */
  async existsToday(userId: number, type: string, title: string): Promise<boolean> {
    const row = await queryOne<CountRow>(
      `SELECT COUNT(*) AS total FROM notifications
        WHERE user_id = ? AND type = ? AND title = ? AND created_at >= CURDATE()`,
      [userId, type, title],
    );
    return (row?.total ?? 0) > 0;
  },

  async markAsRead(userId: number, id: number): Promise<number> {
    const result = await execute(
      'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND read_at IS NULL',
      [id, userId],
    );
    return result.affectedRows;
  },

  async markAllAsRead(userId: number): Promise<number> {
    const result = await execute(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
      [userId],
    );
    return result.affectedRows;
  },

  async delete(userId: number, id: number): Promise<number> {
    const result = await execute('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);
    return result.affectedRows;
  },
};
