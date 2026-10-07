import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../src/features/auth/auth-context';
import { Logo } from '../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../src/shared/theme';

/**
 * Tela de abertura.
 * Decide para onde o usuario vai: login, onboarding ou o app.
 */
export default function SplashScreen() {
  useThemeMode();
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'carregando') return;

    if (status === 'visitante') {
      router.replace('/(auth)/login');
      return;
    }

    if (user && !user.onboardingCompleted) {
      router.replace('/onboarding');
      return;
    }

    router.replace('/(tabs)');
  }, [status, user, router]);

  return (
    <View style={styles.container}>
      <Logo size={44} />
      <Text style={styles.tagline}>Transforme conversas em vendas.</Text>
      <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = createThemedStyles(() => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    gap: theme.spacing.xs,
  },
  tagline: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  loader: {
    marginTop: theme.spacing.lg,
  },
}));
