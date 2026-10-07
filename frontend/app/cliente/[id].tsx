import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { clientsApi } from '../../src/shared/api/resources.api';
import { ApiError, type Client, type Opportunity, type Quote, type Sale } from '../../src/shared/api/types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeader,
} from '../../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';
import { currency, phone as formatPhone, relativeDays } from '../../src/shared/utils/format';

export default function ClienteDetalheScreen() {
  useThemeMode();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = Number(id);

  const [client, setClient] = useState<Client | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await clientsApi.detail(clientId);
      setClient(data.client);
      setOpportunities(data.opportunities);
      setQuotes(data.quotes);
      setSales(data.sales);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Nao foi possivel carregar o cliente.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function openWhatsapp() {
    try {
      const data = await clientsApi.whatsapp(clientId);
      if (!data.link) {
        Alert.alert('Sem WhatsApp', 'Esse cliente ainda nao tem um numero valido no cadastro.');
        return;
      }
      await Linking.openURL(data.link);
      await clientsApi.registerContact(clientId);
      void load();
    } catch {
      Alert.alert('Ops', 'Nao foi possivel abrir o WhatsApp agora.');
    }
  }

  function confirmDelete() {
    Alert.alert('Excluir cliente', `${client?.name} sai da sua lista. O historico de vendas e preservado.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await clientsApi.remove(clientId);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Cliente" />
        <LoadingState />
      </Screen>
    );
  }

  if (error || !client) {
    return (
      <Screen>
        <ScreenHeader title="Cliente" />
        <ErrorState message={error ?? 'Cliente nao encontrado.'} onRetry={() => void load()} />
      </Screen>
    );
  }

  const days = client.lastContactAt
    ? Math.floor((Date.now() - new Date(client.lastContactAt).getTime()) / 86_400_000)
    : null;

  return (
    <Screen scroll>
      <ScreenHeader
        title={client.name}
        action={{ icon: 'edit-2', label: 'Editar', onPress: () => router.push(`/cliente/novo?id=${clientId}`) }}
      />

      <View style={styles.identity}>
        <Avatar name={client.name} size={72} />
        <Text style={styles.name}>{client.name}</Text>
        {client.purchasesCount >= 2 ? (
          <Badge label="Cliente recorrente" tone="recorrente" icon="refresh-cw" />
        ) : client.purchasesCount === 0 ? (
          <Badge label="Ainda nao comprou" tone="novoCliente" icon="user-plus" />
        ) : null}
      </View>

      <View style={styles.metrics}>
        <Card style={styles.metric}>
          <Text style={styles.metricValue}>{currency(client.totalPurchased)}</Text>
          <Text style={styles.metricLabel}>Total comprado</Text>
        </Card>
        <Card style={styles.metric}>
          <Text style={styles.metricValue}>{client.purchasesCount}</Text>
          <Text style={styles.metricLabel}>
            {client.purchasesCount === 1 ? 'Compra' : 'Compras'}
          </Text>
        </Card>
      </View>

      <View style={styles.actions}>
        <Button label="WhatsApp" icon="message-circle" onPress={openWhatsapp} style={styles.actionButton} />
        <Button
          label="Nova oportunidade"
          variant="outline"
          icon="plus"
          onPress={() => router.push(`/oportunidade/nova?clientId=${clientId}`)}
          style={styles.actionButton}
        />
      </View>

      <Text style={styles.sectionTitle}>Contato</Text>
      <Card style={styles.list}>
        <Row icon="phone" label="WhatsApp" value={formatPhone(client.whatsapp ?? client.phone) || 'Nao informado'} />
        <Row icon="mail" label="E-mail" value={client.email ?? 'Nao informado'} />
        <Row icon="hash" label="CPF / CNPJ" value={client.document ?? 'Nao informado'} />
        <Row
          icon="map-pin"
          label="Cidade"
          value={client.address.city ? `${client.address.city}${client.address.state ? ` - ${client.address.state}` : ''}` : 'Nao informada'}
        />
        <Row
          icon="clock"
          label="Ultimo contato"
          value={days === null ? 'Nunca' : relativeDays(days)}
          last
        />
      </Card>

      {client.notes ? (
        <>
          <Text style={styles.sectionTitle}>Observacoes</Text>
          <Card>
            <Text style={styles.notes}>{client.notes}</Text>
          </Card>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Oportunidades</Text>
      {opportunities.length === 0 ? (
        <Text style={styles.empty}>Nenhuma oportunidade ainda.</Text>
      ) : (
        <View style={styles.historyList}>
          {opportunities.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/oportunidade/${item.id}`)}
              style={({ pressed }) => [styles.historyItem, pressed && styles.historyPressed]}
            >
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.historyMeta}>{item.statusLabel}</Text>
              </View>
              <Text style={styles.historyValue}>{currency(item.totalAmount)}</Text>
              <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Propostas</Text>
      {quotes.length === 0 ? (
        <Text style={styles.empty}>Nenhuma proposta enviada.</Text>
      ) : (
        <View style={styles.historyList}>
          {quotes.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/proposta/${item.id}`)}
              style={({ pressed }) => [styles.historyItem, pressed && styles.historyPressed]}
            >
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle}>{item.code}</Text>
                <Text style={styles.historyMeta}>{item.statusLabel}</Text>
              </View>
              <Text style={styles.historyValue}>{currency(item.total)}</Text>
              <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Vendas</Text>
      {sales.length === 0 ? (
        <Text style={styles.empty}>Nenhuma venda registrada.</Text>
      ) : (
        <View style={styles.historyList}>
          {sales.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle} numberOfLines={1}>
                  {item.description ?? 'Venda'}
                </Text>
                <Text style={styles.historyMeta}>
                  {new Date(item.soldAt).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <Text style={styles.historyValueSuccess}>{currency(item.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      <Button
        label="Excluir cliente"
        variant="danger"
        icon="trash-2"
        onPress={confirmDelete}
        style={styles.delete}
      />
    </Screen>
  );
}

function Row({
  icon,
  label,
  value,
  last = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  useThemeMode();
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Feather name={icon} size={16} color={theme.colors.primaryInk} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = createThemedStyles(() => ({
  identity: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.lg,
  },
  name: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  metrics: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  metricLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  actionButton: { flex: 1 },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  list: { padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
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
    color: theme.colors.text,
    maxWidth: '55%',
    textAlign: 'right',
  },
  notes: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  empty: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  historyList: {
    gap: theme.spacing.xs,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
  },
  historyPressed: {
    backgroundColor: theme.colors.surfaceSoftStrong,
  },
  historyInfo: { flex: 1 },
  historyTitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  historyMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  historyValue: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  historyValueSuccess: {
    ...theme.typography.bodyMedium,
    color: theme.colors.success,
  },
  delete: {
    marginTop: theme.spacing.xxl,
  },
}));
