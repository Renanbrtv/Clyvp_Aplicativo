import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ClientCard } from '../../src/features/clients/components/ClientCard';
import { clientsApi, type ClientFilter } from '../../src/shared/api/resources.api';
import { ApiError, type Client } from '../../src/shared/api/types';
import {
  AppHeader,
  EmptyState,
  ErrorState,
  Fab,
  FilterChips,
  LoadingState,
  SearchField,
  Screen,
  type ChipOption,
} from '../../src/shared/components';
import { useAuth } from '../../src/features/auth/auth-context';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';

const FILTERS: Array<ChipOption<ClientFilter>> = [
  { value: 'todos', label: 'Todos' },
  { value: 'recentes', label: 'Recentes' },
  { value: 'recorrentes', label: 'Recorrentes' },
  { value: 'sem_contato', label: 'Sem contato' },
  { value: 'alto_valor', label: 'Alto valor' },
];

export default function ClientesScreen() {
  useThemeMode();
  const router = useRouter();
  const { user, account } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ClientFilter>('todos');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const followUpDays = account?.settings?.followUpDays ?? 3;

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      setError(null);

      try {
        const data = await clientsApi.list({ search: search || undefined, filter });
        setClients(data.clients);
      } catch (loadError) {
        setError(loadError instanceof ApiError ? loadError.message : 'Nao foi possivel carregar os clientes.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, filter],
  );

  // Busca com atraso para nao disparar a cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => void load(), search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  useFocusEffect(
    useCallback(() => {
      void load(true);
    }, [load]),
  );

  const emptyMessage = useMemo(() => {
    if (search) return `Nenhum cliente encontrado para "${search}".`;
    if (filter === 'sem_contato') return 'Nenhum cliente parado. Sua carteira esta em dia.';
    if (filter === 'recorrentes') return 'Ainda nao ha clientes com duas compras ou mais.';
    if (filter === 'alto_valor') return 'Nenhuma compra registrada ainda.';
    return 'Cadastre o primeiro cliente e comece a transformar conversas em vendas.';
  }, [search, filter]);

  return (
    <View style={styles.flex}>
      <Screen padded={false}>
        <View style={styles.header}>
          <AppHeader userName={user?.name ?? ''} onPressAvatar={() => router.push('/(tabs)/perfil')} />

          <Text style={styles.title}>Meus clientes</Text>
          <Text style={styles.subtitle}>Cada contato, uma nova oportunidade.</Text>

          <View style={styles.searchWrapper}>
            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por nome, telefone ou e-mail"
            />
          </View>

          <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

          <View style={styles.countRow}>
            <Text style={styles.count}>
              {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
            </Text>
          </View>
        </View>

        {loading ? (
          <LoadingState label="Carregando seus clientes..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : (
          <FlatList
            data={clients}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load(true)}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <EmptyState
                  icon="users"
                  title={search ? 'Nada encontrado' : 'Nenhum cliente ainda'}
                  message={emptyMessage}
                  actionLabel={search ? undefined : 'Cadastrar cliente'}
                  onAction={search ? undefined : () => router.push('/cliente/novo')}
                />
              </View>
            }
            renderItem={({ item }) => (
              <ClientCard
                client={item}
                followUpDays={Math.max(followUpDays, 7)}
                onPress={() => router.push(`/cliente/${item.id}`)}
                onContacted={() => void clientsApi.registerContact(item.id).then(() => load(true))}
              />
            )}
          />
        )}
      </Screen>

      <Fab
        actions={[
          {
            icon: 'user-plus',
            label: 'Novo cliente',
            description: 'Cadastre em 10 segundos',
            onPress: () => router.push('/cliente/novo'),
          },
          {
            icon: 'zap',
            label: 'Nova oportunidade',
            description: 'Comece uma negociacao',
            onPress: () => router.push('/oportunidade/nova'),
          },
        ]}
      />
    </View>
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
  searchWrapper: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
  },
  count: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  list: {
    paddingHorizontal: theme.screenPadding,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.size.tabBar + 100,
    gap: theme.spacing.sm,
  },
  empty: {
    height: 320,
  },
}));
