import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { followUpsApi } from '../src/shared/api/resources.api';
import { ApiError, type FollowUp, type FollowUpAgenda } from '../src/shared/api/types';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeader,
} from '../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../src/shared/theme';
import { currency } from '../src/shared/utils/format';

const ACTIONS = [
  { status: 'concluido', label: 'Concluido', icon: 'check-circle' },
  { status: 'sem_resposta', label: 'Nao respondeu', icon: 'slash' },
  { status: 'cliente_fechou', label: 'Cliente fechou', icon: 'award' },
  { status: 'cliente_recusou', label: 'Cliente recusou', icon: 'x-circle' },
] as const;

export default function FollowUpsScreen() {
  useThemeMode();
  const router = useRouter();

  const [agenda, setAgenda] = useState<FollowUpAgenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);

    try {
      const data = await followUpsApi.agenda();
      setAgenda(data);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Nao foi possivel carregar a agenda.');
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

  async function openWhatsapp(followUp: FollowUp) {
    try {
      const data = await followUpsApi.whatsapp(followUp.id);
      if (!data.link) {
        Alert.alert('Sem WhatsApp', 'Esse cliente nao tem um numero valido no cadastro.');
        return;
      }
      await Linking.openURL(data.link);
    } catch {
      Alert.alert('Ops', 'Nao foi possivel abrir o WhatsApp.');
    }
  }

  function askResult(followUp: FollowUp) {
    Alert.alert('Como foi o contato?', followUp.clientName ?? followUp.title, [
      ...ACTIONS.map((action) => ({
        text: action.label,
        onPress: async () => {
          await followUpsApi.updateStatus(followUp.id, action.status);
          void load();
        },
      })),
      {
        text: 'Adiar 3 dias',
        onPress: async () => {
          const date = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
          await followUpsApi.updateStatus(followUp.id, 'adiado', date);
          void load();
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Follow-ups" />
        <LoadingState label="Montando sua agenda..." />
      </Screen>
    );
  }

  if (error || !agenda) {
    return (
      <Screen>
        <ScreenHeader title="Follow-ups" />
        <ErrorState message={error ?? 'Nao foi possivel carregar.'} onRetry={() => void load()} />
      </Screen>
    );
  }

  const hasAny = agenda.groups.some((group) => group.items.length > 0);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <ScreenHeader title="Follow-ups" subtitle="Quem precisa de um retorno seu." />

        <View style={styles.counters}>
          <Counter label="Atrasados" value={agenda.counts.atrasados} tone="danger" />
          <Counter label="Hoje" value={agenda.counts.hoje} tone="primary" />
          <Counter label="Amanha" value={agenda.counts.amanha} tone="muted" />
          <Counter label="Semana" value={agenda.counts.semana} tone="muted" />
        </View>

        <Button
          label="Clientes para recuperar"
          variant="outline"
          icon="refresh-cw"
          onPress={() => router.push('/recuperacao')}
          style={styles.recoveryButton}
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
        {!hasAny ? (
          <View style={styles.empty}>
            <EmptyState
              icon="check-circle"
              title="Agenda limpa"
              message="Nenhum retorno pendente. Quando uma proposta ficar parada, ela aparece aqui."
            />
          </View>
        ) : (
          agenda.groups.map((group) =>
            group.items.length === 0 ? null : (
              <View key={group.key} style={styles.group}>
                <Text style={[styles.groupTitle, group.key === 'atrasados' && styles.groupTitleAlert]}>
                  {group.label} · {group.items.length}
                </Text>

                {group.items.map((item) => (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <Avatar name={item.clientName ?? item.title} size={44} />

                      <View style={styles.cardInfo}>
                        <Text style={styles.cardName} numberOfLines={1}>
                          {item.clientName ?? item.title}
                        </Text>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.opportunityTitle ?? item.title}
                        </Text>
                        <View style={styles.badges}>
                          <Badge label={item.typeLabel} tone="neutro" />
                          {item.opportunityAmount ? (
                            <Text style={styles.amount}>{currency(item.opportunityAmount)}</Text>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    <View style={styles.cardActions}>
                      <Button
                        label="WhatsApp"
                        variant="outline"
                        size="small"
                        icon="message-circle"
                        onPress={() => void openWhatsapp(item)}
                        style={styles.grow}
                      />
                      <Button
                        label="Resultado"
                        variant="outline"
                        size="small"
                        icon="check"
                        onPress={() => askResult(item)}
                        style={styles.grow}
                      />
                    </View>

                    {item.opportunityId ? (
                      <Pressable
                        onPress={() => router.push(`/oportunidade/${item.opportunityId}`)}
                        style={styles.link}
                      >
                        <Text style={styles.linkText}>Ver oportunidade</Text>
                        <Feather name="chevron-right" size={14} color={theme.colors.primaryInk} />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            ),
          )
        )}
      </ScrollView>
    </Screen>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone: 'danger' | 'primary' | 'muted' }) {
  useThemeMode();
  const color =
    tone === 'danger' ? theme.colors.danger : tone === 'primary' ? theme.colors.primary : theme.colors.textSecondary;

  return (
    <View style={styles.counter}>
      <Text style={[styles.counterValue, { color }]}>{value}</Text>
      <Text style={styles.counterLabel}>{label}</Text>
    </View>
  );
}

const styles = createThemedStyles(() => ({
  header: { paddingHorizontal: theme.screenPadding },
  counters: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.md,
  },
  counter: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceSoft,
  },
  counterValue: {
    ...theme.typography.h3,
  },
  counterLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  recoveryButton: { marginTop: theme.spacing.md },
  list: {
    paddingHorizontal: theme.screenPadding,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.lg,
  },
  group: { gap: theme.spacing.xs },
  groupTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  groupTitleAlert: { color: theme.colors.danger },
  card: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardName: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  cardTitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: 2,
  },
  amount: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  cardActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  grow: { flex: 1, backgroundColor: theme.colors.surface },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
  },
  linkText: {
    ...theme.typography.caption,
    color: theme.colors.primaryInk,
  },
  empty: { height: 320 },
}));
