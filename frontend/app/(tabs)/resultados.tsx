import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { statsApi } from '../../src/shared/api/resources.api';
import { ApiError, type Results } from '../../src/shared/api/types';
import { useAuth } from '../../src/features/auth/auth-context';
import {
  AppHeader,
  Card,
  ErrorState,
  LoadingState,
  Screen,
} from '../../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';
import { currency, percent } from '../../src/shared/utils/format';

export default function ResultadosScreen() {
  useThemeMode();
  const router = useRouter();
  const { user } = useAuth();

  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);

    try {
      const data = await statsApi.results();
      setResults(data);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Não foi possível carregar os resultados.');
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

  if (loading) {
    return (
      <Screen>
        <AppHeader userName={user?.name ?? ''} />
        <LoadingState label="Carregando seus resultados..." />
      </Screen>
    );
  }

  if (error || !results) {
    return (
      <Screen>
        <AppHeader userName={user?.name ?? ''} />
        <ErrorState message={error ?? 'Sem dados.'} onRetry={() => void load()} />
      </Screen>
    );
  }

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
      <AppHeader userName={user?.name ?? ''} onPressAvatar={() => router.push('/(tabs)/perfil')} />

      <View style={styles.headerBlock}>
        <Text style={styles.title}>Resultados</Text>
        <Text style={styles.subtitle}>{results.period.label}</Text>
      </View>

      <Card tone="primary" style={styles.hero}>
        <Text style={styles.heroLabel}>Vendas do mês</Text>
        <Text style={styles.heroValue}>{currency(results.sales.total)}</Text>
        <Text style={styles.heroMeta}>
          {results.sales.count} {results.sales.count === 1 ? 'venda' : 'vendas'}
          {results.sales.variationPercent !== null
            ? ` · ${percent(results.sales.variationPercent)} em relação ao mês anterior`
            : ''}
        </Text>
      </Card>

      <View style={styles.grid}>
        <Metric label="Oportunidades" value={currency(results.pipeline.openTotal)} hint="em aberto" />
        <Metric label="Ticket médio" value={currency(results.sales.averageTicket)} hint="por venda" />
        <Metric label="Conversão" value={`${results.conversion.rate}%`} hint="oportunidades fechadas" />
        <Metric
          label="Propostas"
          value={`${results.conversion.quoteRate}%`}
          hint={`${results.quotes.accepted} de ${results.quotes.sent} ${
            results.quotes.sent === 1 ? 'proposta aceita' : 'propostas aceitas'
          }`}
        />
      </View>

      <Text style={styles.sectionTitle}>Vendas nos últimos 6 meses</Text>
      <Card style={styles.chartCard}>
        <MonthlyChart series={results.monthlySeries} />
        <View style={styles.chartLabels}>
          {results.monthlySeries.map((item) => (
            <Text key={item.period} style={styles.chartLabel}>
              {item.label}
            </Text>
          ))}
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Propostas</Text>
      <Card style={styles.list}>
        <Row label="Enviadas" value={String(results.quotes.sent)} />
        <Row label="Aceitas" value={String(results.quotes.accepted)} tone="success" />
        <Row label="Recusadas" value={String(results.quotes.rejected)} tone="danger" />
        <Row label="Expiradas" value={String(results.quotes.expired)} />
        <Row label="Rascunhos" value={String(results.quotes.draft)} last />
      </Card>

      <Text style={styles.sectionTitle}>Funil de oportunidades</Text>
      <Card style={styles.list}>
        {results.pipeline.byStatus.length === 0 ? (
          <Text style={styles.empty}>Nenhuma oportunidade foi criada neste mês.</Text>
        ) : (
          results.pipeline.byStatus.map((item, index) => (
            <Row
              key={item.status}
              label={`${item.label} (${item.count})`}
              value={currency(item.total)}
              last={index === results.pipeline.byStatus.length - 1}
            />
          ))
        )}
      </Card>

      <Text style={styles.sectionTitle}>Clientes</Text>
      <Card style={styles.list}>
        <Row label="Novos clientes no mês" value={String(results.clients.new)} />
        <Row label="Recorrentes" value={String(results.clients.recurring)} />
        <Row
          label="Valor em oportunidades perdidas"
          value={currency(results.lost.total)}
          tone="danger"
          last
        />
      </Card>

      {results.topServices.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Serviços mais vendidos</Text>
          <Card style={styles.list}>
            {results.topServices.map((item, index) => (
              <Row
                key={item.name}
                label={`${item.name} (${item.quantity}x)`}
                value={currency(item.total)}
                last={index === results.topServices.length - 1}
              />
            ))}
          </Card>
        </>
      ) : null}

      {results.topProducts.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Produtos mais vendidos</Text>
          <Card style={styles.list}>
            {results.topProducts.map((item, index) => (
              <Row
                key={item.name}
                label={`${item.name} (${item.quantity}x)`}
                value={currency(item.total)}
                last={index === results.topProducts.length - 1}
              />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  useThemeMode();
  return (
    <Card style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.metricHint}>{hint}</Text>
    </Card>
  );
}

function Row({
  label,
  value,
  tone,
  last = false,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'danger';
  last?: boolean;
}) {
  useThemeMode();
  const color =
    tone === 'success' ? theme.colors.success : tone === 'danger' ? theme.colors.danger : theme.colors.text;

  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color }]}>{value}</Text>
    </View>
  );
}

/** Gráfico de barras simples, com os totais reais de cada mês. */
function MonthlyChart({ series }: { series: Results['monthlySeries'] }) {
  useThemeMode();
  const height = 120;
  const max = Math.max(...series.map((item) => item.total), 1);
  const barWidth = 100 / (series.length * 2 - 1);

  return (
    <Svg width="100%" height={height}>
      {series.map((item, index) => {
        const barHeight = Math.max(4, (item.total / max) * (height - 8));
        return (
          <Rect
            key={item.period}
            x={`${index * barWidth * 2}%`}
            y={height - barHeight}
            width={`${barWidth}%`}
            height={barHeight}
            rx={6}
            fill={index === series.length - 1 ? theme.colors.primary : theme.colors.primarySoft}
          />
        );
      })}
    </Svg>
  );
}

const styles = createThemedStyles(() => ({
  headerBlock: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: 2,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  hero: {
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  metric: {
    flexGrow: 1,
    flexBasis: '46%',
    gap: 2,
  },
  metricLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  metricValue: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  metricHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  chartCard: { gap: theme.spacing.xs },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  list: { padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  rowValue: {
    ...theme.typography.bodyMedium,
  },
  empty: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    padding: theme.spacing.md,
  },
}));
