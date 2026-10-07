import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationObserver } from '../src/features/notifications/NotificationObserver';
import { AuthProvider } from '../src/features/auth/auth-context';
import { theme, useThemeMode, createThemedStyles, initializeTheme } from '../src/shared/theme';

export default function RootLayout() {
  const { dark } = useThemeMode();
  const [ready, setReady] = useState(false);
  useEffect(() => { void initializeTheme().finally(() => setReady(true)); }, []);
  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationObserver />
        <StatusBar style={dark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: 'slide_from_right',
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
