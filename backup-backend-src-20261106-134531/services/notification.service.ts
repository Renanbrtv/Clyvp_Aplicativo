import { notificationRepository, type NotificationInput } from '../repositories/notification.repository';
import { dashboardRepository } from '../repositories/dashboard.repository';
import { followUpRepository } from '../repositories/follow-up.repository';
import { settingsRepository } from '../repositories/settings.repository';
import { AppError } from '../utils/app-error';
import { toPublicNotification } from './mappers2';

const currency = (value: number) =>
  `R$ ${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)}`;

/**
 * Notificacoes dentro do app (Etapa 13).
 *
 * Push real depende de expo-notifications + projectId do Expo; a camada esta
 * pronta aqui: basta enviar o push dentro de `push()` quando isso for ligado.
 */
export const notificationService = {
  async list(userId: number, onlyUnread = false) {
    const [rows, unread] = await Promise.all([
      notificationRepository.list(userId, onlyUnread),
      notificationRepository.unreadCount(userId),
    ]);

    return { notifications: rows.map(toPublicNotification), unreadCount: unread };
  },

  async push(userId: number, input: NotificationInput): Promise<void> {
    const settings = await settingsRepository.findByUserId(userId);
    if (settings && settings.notifications_enabled === 0) return;

    const alreadySent = await notificationRepository.existsToday(userId, input.type, input.title);
    if (alreadySent) return;

    await notificationRepository.create(userId, input);
    // TODO (push real): enviar via Expo Push aqui quando o token do aparelho existir.
  },

  async markAsRead(userId: number, id: number) {
    const affected = await notificationRepository.markAsRead(userId, id);
    if (affected === 0) throw AppError.notFound('Notificacao nao encontrada.');
  },

  async markAllAsRead(userId: number) {
    const affected = await notificationRepository.markAllAsRead(userId);
    return { updated: affected };
  },

  async remove(userId: number, id: number) {
    const affected = await notificationRepository.delete(userId, id);
    if (affected === 0) throw AppError.notFound('Notificacao nao encontrada.');
  },

  /**
   * Gera os avisos do dia a partir do estado real do banco.
   * O app chama isso ao abrir; quando houver rotina agendada, ela chama o mesmo metodo.
   */
  async refresh(userId: number) {
    const settings = await settingsRepository.findByUserId(userId);
    const followUpDays = settings?.follow_up_days ?? 3;

    const [attention, open, counts] = await Promise.all([
      dashboardRepository.needsAttention(userId, followUpDays, 20),
      dashboardRepository.openOpportunities(userId),
      followUpRepository.counts(userId),
    ]);

    if (attention.length > 0) {
      await notificationService.push(userId, {
        type: 'sem_resposta',
        title: `${attention.length} ${attention.length === 1 ? 'cliente aguarda' : 'clientes aguardam'} retorno`,
        message:
          attention.length === 1
            ? `${attention[0].client_name} esta ha ${attention[0].dias_sem_contato} dias sem resposta.`
            : `Voce tem ${attention.length} propostas paradas ha ${followUpDays} dias ou mais.`,
        payload: { opportunityIds: attention.map((item) => item.opportunity_id) },
        actionUrl: '/follow-ups',
      });
    }

    const openTotal = Number(open.total ?? 0);
    if (openTotal > 0) {
      await notificationService.push(userId, {
        type: 'dinheiro_na_mesa',
        title: 'Dinheiro na mesa',
        message: `Voce tem ${currency(openTotal)} em oportunidades que ainda nao foram fechadas.`,
        payload: { total: openTotal },
        actionUrl: '/oportunidades',
      });
    }

    if (counts.hoje > 0) {
      await notificationService.push(userId, {
        type: 'follow_up',
        title: 'Follow-ups de hoje',
        message: `${counts.hoje} ${counts.hoje === 1 ? 'cliente precisa' : 'clientes precisam'} de contato hoje.`,
        actionUrl: '/follow-ups',
      });
    }

    return notificationService.list(userId);
  },
};
