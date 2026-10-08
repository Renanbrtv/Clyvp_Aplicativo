import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { opportunitiesApi } from '../../src/shared/api/resources.api';
import { ApiError, type Opportunity, type PipelineColumn } from '../../src/shared/api/types';
import { useAuth } from '../../src/features/auth/auth-context';
import {
  AppHeader,
  Button,
  Avatar,
  Badge,
  EmptyState,
  ErrorState,
  Fab,
  FilterChips,
  LoadingState,
  Screen,
  type ChipOption,
} from '../../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';
import { currency, relativeDays } from '../../src/shared/utils/format';
import Mercado from '../mercado/index';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type StatusFilter = 'abertas' | 'novo_contato' | 'proposta_enviada' | 'negociacao' | 'aguardando_pagamento' | 'fechado' | 'perdido';

const FILTERS: Array<ChipOption<StatusFilter>> = [
  { value: 'abertas', label: 'Em aberto' },
  { value: 'novo_contato', label: 'Novo contato' },
  { value: 'proposta_enviada', label: 'Proposta enviada' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { value: 'fechado', label: 'Fechados' },
  { value: 'perdido', label: 'Perdidos' },
];

const STATUS_TONE: Record<string, 'semResposta' | 'recorrente' | 'novoCliente' | 'altoValor' | 'atencao' | 'neutro'> = {
  novo_contato: 'neutro',
  proposta_enviada: 'semResposta',
  negociacao: 'novoCliente',
  aguardando_pagamento: 'altoValor',
  fechado: 'recorrente',
  perdido: 'atencao',
};

export default function OportunidadesScreen() {
  useThemeMode();
  const [market, setMarket] = useState(true);
  const insets = useSafeAreaInsets();
  return <View style={{flex:1,backgroundColor:theme.colors.background}}>
    <View style={{flexDirection:'row',gap:8,paddingHorizontal:16,paddingTop:insets.top+8}}>
      <View style={{flex:1}}><Button label="Oportunidades" variant={market?'primary':'outline'} onPress={()=>setMarket(true)} /></View>
      <View style={{flex:1}}><Button label="Meu funil" variant={market?'outline':'primary'} onPress={()=>setMarket(false)} /></View>
    </View>
    {market ? <Mercado /> : <FunilScreen />}
  </View>;
}
function FunilScreen() {
  useThemeMode();
  const router = useRouter();
  const { user, account } = useAuth();

  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [totals, setTotals] = useState({ open: 0, count: 0 });
  const [filter, setFilter] = useState<StatusFilter>('abertas');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const followUpDays = account?.settings?.followUpDays ?? 3;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);

    try {
      const data = await opportunitiesApi.pipeline();
      setColumns(data.columns);
      setTotals(data.totals);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Não foi possível carregar o pipeline.');
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

  const visible: PipelineColumn[] =
    filter === 'abertas'
      ? columns.filter((column) => column.status !== 'fechado' && column.status !== 'perdido')
      : columns.filter((column) => column.status === filter);

  const items = visible.flatMap((column) => column.opportunities);

  return (
    <View style={styles.flex}>
      <Screen padded={false}>
        <View style={styles.header}>
          <AppHeader userName={user?.name ?? ''} onPressAvatar={() => router.push('/(tabs)/perfil')} />

          <Button label="Encontrar oportunidades" onPress={() => router.push('/mercado')} />
          <Text style={styles.title}>Meu funil de oportunidades</Text>
          <Text style={styles.subtitle}>
            {currency(totals.open)} em negociação agora.
          </Text>

          <View style={styles.chips}>
            <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
          </View>
        </View>

        {loading ? (
          <LoadingState label="Carregando o pipeline..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : (
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
            {items.length === 0 ? (
              <View style={styles.empty}>
                <EmptyState
                  icon="trending-up"
                  title="Nenhuma oportunidade aqui"
                  message={
                    filter === 'abertas'
                      ? 'Crie uma oportunidade e acompanhe cada negociação até o fechamento.'
                      : 'Nenhuma oportunidade nesse status no momento.'
                  }
                  actionLabel={filter === 'abertas' ? 'Nova oportunidade' : undefined}
                  onAction={filter === 'abertas' ? () => router.push('/oportunidade/nova') : undefined}
                />
              </View>
            ) : (
              visible.map((column) =>
                column.opportunities.length === 0 ? null : (
                  <View key={column.status} style={styles.group}>
                    <View style={styles.groupHeader}>
                      <Text style={styles.groupTitle}>{column.label}</Text>
                      <Text style={styles.groupTotal}>
                        {column.count} · {currency(column.total)}
                      </Text>
                    </View>

                    {column.opportunities.map((item) => (
                      <OpportunityRow
                        key={item.id}
                        item={item}
                        followUpDays={followUpDays}
                        onPress={() => router.push(`/oportunidade/${item.id}`)}
                      />
                    ))}
                  </View>
                ),
              )
            )}
          </ScrollView>
        )}
      </Screen>

      <Fab
        actions={[
          {
            icon: 'zap',
            label: 'Nova oportunidade',
            description: 'Cliente, item e valor',
            onPress: () => router.push('/oportunidade/nova'),
          },
          {
            icon: 'user-plus',
            label: 'Novo cliente',
            onPress: () => router.push('/cliente/novo'),
          },
        ]}
      />
    </View>
  );
}

function OpportunityRow({
  item,
  followUpDays,
  onPress,
}: {
  item: Opportunity;
  followUpDays: number;
  onPress: () => void;
}) {
  useThemeMode();
  const stalled =
    item.daysWithoutContact >= followUpDays && item.status !== 'fechado' && item.status !== 'perdido';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, stalled && styles.cardStalled, pressed && styles.pressed]}
    >
      <Avatar name={item.clientName} size={44} />

      <View style={styles.cardInfo}>
        <Text style={styles.client} numberOfLines={1}>
          {item.clientName}
        </Text>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>

        <View style={styles.cardMeta}>
          <Badge label={item.statusLabel} tone={STATUS_TONE[item.status] ?? 'neutro'} />
          <Text style={[styles.days, stalled && styles.daysAlert]}>
            {relativeDays(item.daysWithoutContact)}
          </Text>
        </View>
      </View>

      <View style={styles.cardRight}>
        <Text style={styles.value}>{currency(item.totalAmount)}</Text>
        <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = createThemedStyles(() => ({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: theme.screenPadding,
    gap: 2,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  chips: {
    paddingTop: theme.spacing.md,
  },
  list: {
    paddingHorizontal: theme.screenPadding,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.size.tabBar + 100,
    gap: theme.spacing.lg,
  },
  group: {
    gap: theme.spacing.xs,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.xxs,
  },
  groupTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  groupTotal: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardStalled: {
    backgroundColor: theme.colors.surfaceSoft,
    borderColor: 'transparent',
  },
  pressed: { opacity: 0.9 },
  cardInfo: { flex: 1, gap: 2 },
  client: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  cardTitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: 2,
  },
  days: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  daysAlert: {
    color: theme.colors.danger,
  },
  cardRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 2,
  },
  value: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  empty: { height: 340 },
}));
