import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { followUpsApi } from '../src/shared/api/resources.api';
import { ApiError, type RecoveryItem } from '../src/shared/api/types';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeader,
} from '../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../src/shared/theme';
import { currency, waitingLabel } from '../src/shared/utils/format';

/** Etapa 11: clientes que sumiram, com a mensagem de retomada pronta. */
export default function RecuperacaoScreen() {
  useThemeMode();
  const router = useRouter();

  const [items, setItems] = useState<RecoveryItem[]>([]);
  const [totalAtRisk, setTotalAtRisk] = useState(0);
  const [followUpDays, setFollowUpDays] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await followUpsApi.recovery();
      setItems(data.items);
      setTotalAtRisk(data.totalAtRisk);
      setFollowUpDays(data.followUpDays);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Nao foi possivel carregar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function recover(item: RecoveryItem) {
    if (!item.link) {
      Alert.alert('Sem WhatsApp', `${item.clientName} nao tem um numero valido no cadastro.`);
      return;
    }
    await Linking.openURL(item.link);
  }

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Recuperar clientes" />
        <LoadingState />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="Recuperar clientes" />
        <ErrorState message={error} onRetry={() => void load()} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader
        title="Clientes que precisam de atencao"
        subtitle={`Parados ha ${followUpDays} dias ou mais.`}
      />

      {items.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            icon="check-circle"
            title="Ninguem esperando"
            message="Todas as suas propostas tiveram retorno recente. Bom trabalho."
          />
        </View>
      ) : (
        <>
          <Card tone="primary" style={styles.hero}>
            <Text style={styles.heroLabel}>Dinheiro na mesa</Text>
            <Text style={styles.heroValue}>{currency(totalAtRisk)}</Text>
            <Text style={styles.heroMeta}>
              em {items.length} {items.length === 1 ? 'proposta parada' : 'propostas paradas'}
            </Text>
          </Card>

          <View style={styles.list}>
            {items.map((item) => (
              <View key={item.opportunityId} style={styles.card}>
                <View style={styles.cardTop}>
                  <Avatar name={item.clientName} size={48} />

                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.clientName}
                    </Text>
                    <Text style={styles.detail} numberOfLines={1}>
                      {item.title} · {currency(item.amount)}
                    </Text>
                    <View style={styles.alertRow}>
                      <Feather name="clock" size={13} color={theme.colors.danger} />
                      <Text style={styles.alert}>{waitingLabel(item.daysWithoutContact)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.preview}>
                  <Text style={styles.previewLabel}>Mensagem pronta</Text>
                  <Text style={styles.previewText} numberOfLines={4}>
                    {item.message}
                  </Text>
                </View>

                <Button
                  label="Recuperar cliente"
                  icon="message-circle"
                  onPress={() => void recover(item)}
                  style={styles.recoverButton}
                />

                <Pressable
                  onPress={() => router.push(`/oportunidade/${item.opportunityId}`)}
                  style={styles.link}
                >
                  <Text style={styles.linkText}>Ver oportunidade</Text>
                  <Feather name="chevron-right" size={14} color={theme.colors.primaryInk} />
                </Pressable>
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = createThemedStyles(() => ({
  hero: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
    gap: 2,
  },
  heroLabel: {
    ...theme.typography.body,
    color: theme.colors.onPrimaryMuted,
  },
  heroValue: {
    ...theme.typography.display,
    color: theme.colors.onPrimary,
  },
  heroMeta: {
    ...theme.typography.caption,
    color: theme.colors.onPrimaryMuted,
  },
  list: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
  },
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
  info: { flex: 1, gap: 2 },
  name: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  detail: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  alert: {
    ...theme.typography.caption,
    color: theme.colors.danger,
  },
  preview: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    gap: 2,
  },
  previewLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  previewText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  recoverButton: {},
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
  empty: { height: 400 },
}));
