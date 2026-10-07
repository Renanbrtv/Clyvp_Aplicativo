import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { notificationsApi } from '../src/shared/api/resources.api';
import { ApiError, type AppNotification } from '../src/shared/api/types';
import { EmptyState, ErrorState, LoadingState, Screen, ScreenHeader } from '../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../src/shared/theme';

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  sem_resposta: 'clock',
  dinheiro_na_mesa: 'dollar-sign',
  follow_up: 'bell',
  venda: 'award',
  garantia: 'shield',
  sistema: 'info',
};

export default function NotificacoesScreen() {
  useThemeMode();
  const router = useRouter();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);

    try {
      // "atualizar" recalcula os avisos a partir do estado real do banco.
      const data = await notificationsApi.refresh();
      setNotifications(data.notifications);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Nao foi possivel carregar.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function open(item: AppNotification) {
    if (!item.read) {
      await notificationsApi.markAsRead(item.id);
      setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    }

    if (item.actionUrl) router.push(item.actionUrl as never);
  }

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Notificacoes" />
        <LoadingState />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="Notificacoes" />
        <ErrorState message={error} onRetry={() => void load()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <ScreenHeader
          title="Notificacoes"
          action={
            notifications.some((item) => !item.read)
              ? {
                  icon: 'check-circle',
                  label: 'Marcar tudo como lido',
                  onPress: async () => {
                    await notificationsApi.markAllAsRead();
                    void load();
                  },
                }
              : undefined
          }
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <EmptyState
              icon="bell"
              title="Nada por aqui"
              message="Quando um cliente ficar sem resposta ou uma garantia vencer, o aviso aparece aqui."
            />
          </View>
        ) : (
          notifications.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => void open(item)}
              style={({ pressed }) => [styles.card, !item.read && styles.cardUnread, pressed && styles.pressed]}
            >
              <View style={styles.icon}>
                <Feather name={ICONS[item.type] ?? 'bell'} size={18} color={theme.colors.primary} />
              </View>

              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </Text>
              </View>

              {!item.read ? <View style={styles.dot} /> : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = createThemedStyles(() => ({
  header: { paddingHorizontal: theme.screenPadding },
  list: {
    paddingHorizontal: theme.screenPadding,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.xs,
  },
  card: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardUnread: {
    backgroundColor: theme.colors.surfaceSoft,
    borderColor: 'transparent',
  },
  pressed: { opacity: 0.9 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSoftStrong,
  },
  info: { flex: 1, gap: 2 },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  message: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  date: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  },
  empty: { height: 400 },
}));
