import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';

import { useAuth } from '../../src/features/auth/auth-context';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: 'home',
  oportunidades: 'trending-up',
  clientes: 'users',
  resultados: 'bar-chart-2',
  perfil: 'user',
};

const LABELS: Record<string, string> = {
  index: 'Inicio',
  oportunidades: 'Oportunidades',
  clientes: 'Clientes',
  resultados: 'Resultados',
  perfil: 'Perfil',
};

/**
 * Tab bar desenhada a mao para seguir o design aprovado:
 * item ativo em laranja dentro de um pill, inativo em cinza.
 */
function ClyvoTabBar({ state, navigation }: BottomTabBarProps) {
  useThemeMode();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.xs) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const icon = ICONS[route.name] ?? 'circle';
        const label = LABELS[route.name] ?? route.name;
        const color = focused ? theme.colors.primary : theme.colors.textSecondary;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={styles.tabItem}
          >
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <Feather name={icon} size={22} color={color} />
            </View>
            <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  useThemeMode();
  const { status, user } = useAuth();
  const router = useRouter();

  // Protege as telas internas: sem sessao, volta para o login.
  useEffect(() => {
    if (status === 'visitante') {
      router.replace('/(auth)/login');
      return;
    }
    if (status === 'autenticado' && user && !user.onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [status, user, router]);

  return (
    <Tabs
      tabBar={(props) => <ClyvoTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="oportunidades" options={{ title: 'Oportunidades' }} />
      <Tabs.Screen name="clientes" options={{ title: 'Clientes' }} />
      <Tabs.Screen name="resultados" options={{ title: 'Resultados' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}

const styles = createThemedStyles(() => ({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: theme.palette.gray900,
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
      },
      default: {},
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  iconWrapper: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  iconWrapperActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  tabLabel: {
    ...theme.typography.tab,
  },
}));
