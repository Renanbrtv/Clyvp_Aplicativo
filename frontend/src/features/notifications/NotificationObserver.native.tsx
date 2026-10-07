import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../auth/auth-context';
export function NotificationObserver() {
 const { user } = useAuth(); const router = useRouter();
 useEffect(() => {
  if (!user) return;
  const open = (response: Notifications.NotificationResponse | null) => {
   const data = response?.notification.request.content.data;
   if (!data?.clyvoReminder) return;
   void Notifications.clearLastNotificationResponseAsync();
   if (data.userId === user.id) router.push('/(tabs)');
  };
  open(Notifications.getLastNotificationResponse());
  const subscription = Notifications.addNotificationResponseReceivedListener(open);
  return () => subscription.remove();
 }, [user?.id, router]);
 return null;
}
