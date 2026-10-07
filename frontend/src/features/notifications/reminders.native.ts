import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
export type ReminderSettings = { enabled: boolean; hour: number; minute: number };
const ID = 'clyvo-daily-reminder';
const TEST_ID = 'clyvo-test-reminder';
const KEY = 'clyvo.reminder';
const CHANNEL = 'clyvo-lembretes';
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
async function permission() {
 if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Lembretes do Clyvo', importance: Notifications.AndroidImportance.DEFAULT, sound: null, enableVibrate: false });
 const result = await Notifications.requestPermissionsAsync();
 if (!result.granted && result.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) throw new Error('Notificacoes desativadas. Libere a permissao nas configuracoes do celular para receber lembretes.');
}
export const reminders = {
 supported: true,
 async read(userId: number): Promise<ReminderSettings> {
  const value = await SecureStore.getItemAsync(KEY);
  if (!value) return { enabled: false, hour: 9, minute: 0 };
  let saved; try { saved = JSON.parse(value); } catch { await reminders.clear(); return { enabled: false, hour: 9, minute: 0 }; }
  if (saved.userId !== userId) { await reminders.clear(); return { enabled: false, hour: 9, minute: 0 }; }
  const [scheduled, permissions] = await Promise.all([Notifications.getAllScheduledNotificationsAsync(), Notifications.getPermissionsAsync()]);
  return { enabled: scheduled.some(n => n.identifier === ID) && (permissions.granted || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL), hour: saved.hour, minute: saved.minute };
 },
 async save(userId: number, settings: ReminderSettings): Promise<void> {
  if (!Number.isInteger(settings.hour) || settings.hour < 0 || settings.hour > 23 || !Number.isInteger(settings.minute) || settings.minute < 0 || settings.minute > 59) throw new Error('Informe um horario valido.');
  if (!settings.enabled) { await reminders.clear(); return; }
  await permission();
  await Notifications.cancelScheduledNotificationAsync(ID);
  await Notifications.scheduleNotificationAsync({ identifier: ID, content: { title: 'Seu dia no Clyvo', body: 'Reserve um momento para revisar seus clientes, propostas e retornos.', data: { clyvoReminder: true, userId }, sound: false }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: settings.hour, minute: settings.minute, channelId: CHANNEL } });
  try { await SecureStore.setItemAsync(KEY, JSON.stringify({ userId, hour: settings.hour, minute: settings.minute })); }
  catch (error) { await Notifications.cancelScheduledNotificationAsync(ID); throw error; }
 },
 async test(): Promise<void> {
  await permission();
  await Notifications.cancelScheduledNotificationAsync(TEST_ID);
  await Notifications.scheduleNotificationAsync({ identifier: TEST_ID, content: { title: 'Clyvo: lembrete de teste', body: 'As notificacoes deste aparelho estao funcionando.', sound: false }, trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL } });
 },
 async clear(): Promise<void> {
  await Promise.all([Notifications.cancelScheduledNotificationAsync(ID), Notifications.cancelScheduledNotificationAsync(TEST_ID), Notifications.dismissAllNotificationsAsync()]);
  await SecureStore.deleteItemAsync(KEY);
 },
};
