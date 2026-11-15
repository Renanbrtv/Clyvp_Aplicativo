import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { useAuth } from '../../src/features/auth/auth-context';
import { DashboardMarket } from '../../src/features/marketplace/DashboardMarket';
import { ActionCard } from '../../src/features/dashboard/components/ActionCard';
import { AttentionCard } from '../../src/features/dashboard/components/AttentionCard';
import { SalesCard } from '../../src/features/dashboard/components/SalesCard';
import { StatsCard } from '../../src/features/dashboard/components/StatsCard';
import { dashboardApi } from '../../src/shared/api/auth.api';
import { ApiError, type DashboardSummary } from '../../src/shared/api/types';
import {
  AppHeader,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
} from '../../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';
import { currency } from '../../src/shared/utils/format';

export default function InicioScreen() {
  useThemeMode();
  const { user } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await dashboardApi.summary();
      setSummary(data);
    } catch (loadError) {
      setError(
        loadError instanceof ApiError
          ? loadError.message
          : 'Nao foi possivel carregar o seu resumo.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const userName = summary?.user.name ?? user?.name ?? '';

  if (loading && !summary) {
    return (
      <Screen>
        <AppHeader userName={userName} />
        <LoadingState label="Montando o seu resumo..." />
      </Screen>
    );
  }

  if (error && !summary) {
    return (
      <Screen>
        <AppHeader userName={userName} />
        <ErrorState message={error} onRetry={() => void load()} />
      </Screen>
    );
  }

  if (!summary) return null;

  const hasAttention = summary.needsAttention.length > 0;

  return (
    <Screen
      scroll
      bottomInset={theme.size.tabBar}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      <AppHeader
        userName={userName}
        hasNotifications={hasAttention}
        onPressNotifications={() => router.push('/notificacoes')}
        onPressAvatar={() => router.push('/(tabs)/perfil')}
      />

      <View style={styles.greeting}>
        <Text style={styles.hello}>Ola, {summary.user.firstName}</Text>
        <Text style={styles.tagline}>Vamos transformar conversas em vendas?</Text>
      </View>

      <DashboardMarket />
      <Button label="Perguntar a Cly" icon="message-circle" variant="outline" onPress={() => router.push('/cly')} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Resumo do mes</Text>
        <View style={styles.monthChip}>
          <Text style={styles.monthText}>{summary.period.label}</Text>
        </View>
      </View>

      <SalesCard
        total={summary.sales.total}
        variationPercent={summary.sales.variationPercent}
        previousLabel={summary.period.previousLabel}
        series={summary.sales.weeklySeries}
      />

      <View style={styles.spacerSmall} />

      <StatsCard
        openTotal={summary.opportunities.openTotal}
        negotiations={summary.opportunities.negotiations}
        waitingResponse={summary.opportunities.waitingResponse}
      />

      <View style={styles.actions}>
        <ActionCard
          icon="users"
          label="Clientes"
          badge={`${summary.clients.total} cadastrados`}
          onPress={() => router.push('/(tabs)/clientes')}
        />
        <ActionCard
          icon="file-text"
          label="Orcamentos"
          badge={
            summary.quotes.pendingCount > 0
              ? `${summary.quotes.pendingCount} pendentes`
              : 'Nenhum pendente'
          }
          onPress={() => router.push('/(tabs)/oportunidades')}
        />
      </View>

      <Button
        label="Nova oportunidade"
        icon="plus"
        style={styles.newButton}
        onPress={() => router.push('/oportunidade/nova')}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Precisa da sua atencao</Text>
        {hasAttention ? (
          <Pressable onPress={() => router.push('/recuperacao')} hitSlop={theme.hitSlop}>
            <Text style={styles.sectionAction}>Ver todos</Text>
          </Pressable>
        ) : null}
      </View>

      {hasAttention ? (
        <View style={styles.attentionList}>
          {summary.needsAttention.map((item) => (
            <AttentionCard key={item.opportunityId} item={item} userName={userName} />
          ))}

          <Text style={styles.footnote}>
            Somando {currency(summary.needsAttention.reduce((sum, item) => sum + item.amount, 0))} em
            propostas paradas ha {summary.followUpDays} dias ou mais.
          </Text>
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <EmptyState
            icon="check-circle"
            title="Tudo em dia"
            message="Nenhum cliente esperando resposta. Quando alguem ficar parado, ele aparece aqui."
          />
        </View>
      )}
    </Screen>
  );
}

const styles = createThemedStyles(() => ({
  greeting: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: 2,
  },
  hello: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  tagline: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.sm,
    paddingTop: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  sectionAction: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primaryInk,
  },
  monthChip: {
    backgroundColor: theme.colors.surfaceSoft,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
  },
  monthText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  spacerSmall: {
    height: theme.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  newButton: {
    marginTop: theme.spacing.sm,
  },
  attentionList: {
    gap: theme.spacing.sm,
  },
  footnote: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    paddingTop: theme.spacing.xxs,
  },
  emptyBox: {
    height: 260,
  },
}));
