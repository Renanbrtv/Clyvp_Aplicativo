import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { opportunitiesApi } from '../../src/shared/api/resources.api';
import { ApiError, type Opportunity, type Quote } from '../../src/shared/api/types';
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
import { currency, relativeDays, whatsappLink } from '../../src/shared/utils/format';

const STATUS_FLOW = [
  { value: 'novo_contato', label: 'Novo contato', icon: 'user' },
  { value: 'proposta_enviada', label: 'Proposta enviada', icon: 'send' },
  { value: 'negociacao', label: 'Negociacao', icon: 'message-square' },
  { value: 'aguardando_pagamento', label: 'Aguardando pagamento', icon: 'clock' },
  { value: 'fechado', label: 'Fechado', icon: 'check-circle' },
  { value: 'perdido', label: 'Perdido', icon: 'x-circle' },
] as const;

interface HistoryEntry {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

export default function OportunidadeDetalheScreen() {
  useThemeMode();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const opportunityId = Number(id);

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await opportunitiesApi.detail(opportunityId);
      setOpportunity(data.opportunity);
      setQuotes(data.quotes);
      setHistory(data.history);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Nao foi possivel carregar.');
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function changeStatus(status: string) {
    if (!opportunity || status === opportunity.status) return;

    if (status === 'fechado') {
      Alert.alert(
        'Fechar venda',
        `Registrar ${currency(opportunity.totalAmount)} como venda de ${opportunity.clientName}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Fechar venda', onPress: () => void apply(status, true) },
        ],
      );
      return;
    }

    if (status === 'perdido') {
      Alert.alert('Marcar como perdida', 'Essa oportunidade sai do seu pipeline ativo.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Marcar', style: 'destructive', onPress: () => void apply(status, false) },
      ]);
      return;
    }

    await apply(status, false);
  }

  async function apply(status: string, registerSale: boolean) {
    setChanging(true);
    try {
      await opportunitiesApi.changeStatus(opportunityId, { status, registerSale });
      await load();
    } catch (changeError) {
      Alert.alert('Ops', changeError instanceof ApiError ? changeError.message : 'Nao foi possivel mudar o status.');
    } finally {
      setChanging(false);
    }
  }

  async function openWhatsapp() {
    if (!opportunity) return;

    const link = whatsappLink(
      opportunity.whatsapp,
      `Ola, ${opportunity.clientName.split(' ')[0]}! Tudo bem?\n\nPassando para falar sobre ${opportunity.title}.`,
    );

    if (!link) {
      Alert.alert('Sem WhatsApp', 'Esse cliente nao tem um numero valido no cadastro.');
      return;
    }

    await Linking.openURL(link);
    await opportunitiesApi.registerContact(opportunityId);
    void load();
  }

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Oportunidade" />
        <LoadingState />
      </Screen>
    );
  }

  if (error || !opportunity) {
    return (
      <Screen>
        <ScreenHeader title="Oportunidade" />
        <ErrorState message={error ?? 'Nao encontrada.'} onRetry={() => void load()} />
      </Screen>
    );
  }

  const stalled = opportunity.daysWithoutContact >= 3 && !['fechado', 'perdido'].includes(opportunity.status);

  return (
    <Screen scroll>
      <ScreenHeader title={opportunity.title} subtitle={opportunity.clientName} />

      <Card tone="primary" style={styles.hero}>
        <Text style={styles.heroLabel}>Valor da oportunidade</Text>
        <Text style={styles.heroValue}>{currency(opportunity.totalAmount)}</Text>
        <Text style={styles.heroMeta}>
          {opportunity.statusLabel} · ultimo contato {relativeDays(opportunity.daysWithoutContact)}
        </Text>
      </Card>

      {stalled ? (
        <View style={styles.alert}>
          <Feather name="alert-circle" size={16} color={theme.colors.danger} />
          <Text style={styles.alertText}>
            Parado ha {opportunity.daysWithoutContact} dias. Que tal dar um retorno?
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button label="WhatsApp" icon="message-circle" onPress={openWhatsapp} style={styles.grow} />
        <Button
          label="Proposta"
          variant="outline"
          icon="file-text"
          onPress={() => router.push(`/proposta/nova?opportunityId=${opportunityId}&clientId=${opportunity.clientId}`)}
          style={styles.grow}
        />
      </View>

      <Text style={styles.sectionTitle}>Em que pe esta</Text>
      <View style={styles.statusGrid}>
        {STATUS_FLOW.map((status) => {
          const active = opportunity.status === status.value;
          return (
            <Pressable
              key={status.value}
              onPress={() => void changeStatus(status.value)}
              disabled={changing}
              style={({ pressed }) => [
                styles.statusChip,
                active && styles.statusChipActive,
                pressed && !active && styles.pressed,
              ]}
            >
              <Feather
                name={status.icon}
                size={16}
                color={active ? theme.colors.onPrimary : theme.colors.primaryInk}
              />
              <Text style={[styles.statusLabel, active && styles.statusLabelActive]}>{status.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Cliente</Text>
      <Pressable
        onPress={() => router.push(`/cliente/${opportunity.clientId}`)}
        style={({ pressed }) => [styles.clientRow, pressed && styles.pressed]}
      >
        <Avatar name={opportunity.clientName} size={44} />
        <Text style={styles.clientName}>{opportunity.clientName}</Text>
        <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
      </Pressable>

      <Text style={styles.sectionTitle}>Propostas</Text>
      {quotes.length === 0 ? (
        <Text style={styles.empty}>Nenhuma proposta ainda. Monte uma com os itens do seu catalogo.</Text>
      ) : (
        <View style={styles.list}>
          {quotes.map((quote) => (
            <Pressable
              key={quote.id}
              onPress={() => router.push(`/proposta/${quote.id}`)}
              style={({ pressed }) => [styles.quoteRow, pressed && styles.pressed]}
            >
              <View style={styles.grow}>
                <Text style={styles.quoteCode}>{quote.code}</Text>
                <Badge label={quote.statusLabel} tone="neutro" />
              </View>
              <Text style={styles.quoteTotal}>{currency(quote.total)}</Text>
              <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      {opportunity.description ? (
        <>
          <Text style={styles.sectionTitle}>Observacoes</Text>
          <Card>
            <Text style={styles.notes}>{opportunity.description}</Text>
          </Card>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Historico</Text>
      <View style={styles.list}>
        {history.map((entry) => (
          <View key={entry.id} style={styles.historyRow}>
            <View style={styles.historyDot} />
            <View style={styles.grow}>
              <Text style={styles.historyText}>
                {entry.fromStatus ? `${labelOf(entry.fromStatus)} → ` : ''}
                {labelOf(entry.toStatus)}
              </Text>
              {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
            </View>
            <Text style={styles.historyDate}>
              {new Date(entry.createdAt).toLocaleDateString('pt-BR')}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function labelOf(status: string): string {
  return STATUS_FLOW.find((item) => item.value === status)?.label ?? status;
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
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.dangerSoft,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing.sm,
  },
  alertText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  grow: { flex: 1 },
  pressed: { opacity: 0.85 },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceSoftStrong,
  },
  statusChipActive: {
    backgroundColor: theme.colors.primary,
  },
  statusLabel: {
    ...theme.typography.caption,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  statusLabelActive: {
    color: theme.colors.onPrimary,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceSoft,
  },
  clientName: {
    ...theme.typography.title,
    color: theme.colors.text,
    flex: 1,
  },
  list: { gap: theme.spacing.xs },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quoteCode: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
    marginBottom: 3,
  },
  quoteTotal: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  empty: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  notes: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  historyText: {
    ...theme.typography.caption,
    color: theme.colors.text,
  },
  historyNote: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  historyDate: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
}));
