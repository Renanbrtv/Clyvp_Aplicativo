import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { catalogApi } from '../../src/shared/api/resources.api';
import { ApiError, type Product, type ServiceItem } from '../../src/shared/api/types';
import {
  Badge,
  EmptyState,
  ErrorState,
  Fab,
  FilterChips,
  LoadingState,
  Screen,
  ScreenHeader,
  SearchField,
  type ChipOption,
} from '../../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';
import { currency } from '../../src/shared/utils/format';

type Tab = 'servicos' | 'produtos';

const TABS: Array<ChipOption<Tab>> = [
  { value: 'servicos', label: 'Servicos' },
  { value: 'produtos', label: 'Produtos' },
];

export default function CatalogoScreen() {
  useThemeMode();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('servicos');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await catalogApi.full(search || undefined);
      setProducts(data.products);
      setServices(data.services);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Nao foi possivel carregar o catalogo.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const showingServices = tab === 'servicos';
  const isEmpty = showingServices ? services.length === 0 : products.length === 0;

  return (
    <View style={styles.flex}>
      <Screen>
        <ScreenHeader title="Catalogo" subtitle="O que voce vende, pronto para montar propostas." />

        <View style={styles.searchWrapper}>
          <SearchField value={search} onChangeText={setSearch} placeholder="Buscar no catalogo" />
        </View>

        <FilterChips options={TABS} value={tab} onChange={setTab} />

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : isEmpty ? (
          <View style={styles.empty}>
            <EmptyState
              icon={showingServices ? 'tool' : 'package'}
              title={showingServices ? 'Nenhum servico' : 'Nenhum produto'}
              message={
                showingServices
                  ? 'Cadastre os servicos que voce faz e monte orcamentos em segundos.'
                  : 'Cadastre os produtos que voce vende com preco e estoque.'
              }
              actionLabel={showingServices ? 'Novo servico' : 'Novo produto'}
              onAction={() => router.push(showingServices ? '/catalogo/servico' : '/catalogo/produto')}
            />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {showingServices
              ? services.map((service) => (
                  <Pressable
                    key={service.id}
                    onPress={() => router.push(`/catalogo/servico?id=${service.id}`)}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName}>{service.name}</Text>
                      <View style={styles.rowMeta}>
                        {service.warrantyDays ? (
                          <Text style={styles.meta}>Garantia {service.warrantyDays}d</Text>
                        ) : null}
                        {service.estimatedTimeMinutes ? (
                          <Text style={styles.meta}>
                            {Math.round(service.estimatedTimeMinutes / 60)}h estimadas
                          </Text>
                        ) : null}
                        {!service.isActive ? <Badge label="Inativo" tone="neutro" /> : null}
                      </View>
                    </View>
                    <Text style={styles.price}>{currency(service.price)}</Text>
                    <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                  </Pressable>
                ))
              : products.map((product) => (
                  <Pressable
                    key={product.id}
                    onPress={() => router.push(`/catalogo/produto?id=${product.id}`)}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName}>{product.name}</Text>
                      <View style={styles.rowMeta}>
                        {product.sku ? <Text style={styles.meta}>{product.sku}</Text> : null}
                        {product.trackStock ? (
                          <Text style={[styles.meta, product.stock === 0 && styles.metaAlert]}>
                            Estoque: {product.stock}
                          </Text>
                        ) : null}
                        {!product.isActive ? <Badge label="Inativo" tone="neutro" /> : null}
                      </View>
                    </View>
                    <View style={styles.priceBox}>
                      {product.promoPrice ? (
                        <>
                          <Text style={styles.priceOld}>{currency(product.price)}</Text>
                          <Text style={styles.price}>{currency(product.promoPrice)}</Text>
                        </>
                      ) : (
                        <Text style={styles.price}>{currency(product.price)}</Text>
                      )}
                    </View>
                    <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                  </Pressable>
                ))}
          </ScrollView>
        )}
      </Screen>

      <Fab
        bottom={24}
        actions={[
          { icon: 'tool', label: 'Novo servico', onPress: () => router.push('/catalogo/servico') },
          { icon: 'package', label: 'Novo produto', onPress: () => router.push('/catalogo/produto') },
        ]}
      />
    </View>
  );
}

const styles = createThemedStyles(() => ({
  flex: { flex: 1 },
  searchWrapper: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  list: {
    paddingTop: theme.spacing.sm,
    paddingBottom: 120,
    gap: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pressed: { opacity: 0.88 },
  rowInfo: { flex: 1, gap: 3 },
  rowName: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  meta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  metaAlert: { color: theme.colors.danger },
  priceBox: { alignItems: 'flex-end' },
  price: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  priceOld: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  empty: { flex: 1 },
}));
