import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { buildQuoteHtml } from '../../src/features/quotes/quote-pdf';
import { quotesApi } from '../../src/shared/api/resources.api';
import { ApiError, type QuoteDocument } from '../../src/shared/api/types';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeader,
} from '../../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';
import { currency } from '../../src/shared/utils/format';

const STATUS_TONE: Record<string, 'semResposta' | 'recorrente' | 'novoCliente' | 'atencao' | 'neutro'> = {
  rascunho: 'neutro',
  enviado: 'semResposta',
  visualizado: 'novoCliente',
  aceito: 'recorrente',
  recusado: 'atencao',
  expirado: 'atencao',
  cancelado: 'neutro',
};

export default function PropostaScreen() {
  useThemeMode();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const quoteId = Number(id);

  const [document, setDocument] = useState<QuoteDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await quotesApi.document(quoteId);
      setDocument(data);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Nao foi possivel carregar a proposta.');
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  /** Gera o PDF no aparelho e abre a folha de compartilhamento. */
  async function generatePdf(share: boolean) {
    if (!document) return;
    setBusy(true);

    try {
      const { uri } = await Print.printToFileAsync({ html: buildQuoteHtml(document), base64: false });

      if (share && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Proposta ${document.quote.code}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Print.printAsync({ uri });
      }
    } catch {
      Alert.alert('Ops', 'Nao foi possivel gerar o PDF agora.');
    } finally {
      setBusy(false);
    }
  }

  async function sendWhatsapp() {
    setBusy(true);
    try {
      const data = await quotesApi.whatsapp(quoteId);

      if (!data.link) {
        Alert.alert('Sem WhatsApp', 'Esse cliente nao tem um numero valido no cadastro.');
        return;
      }

      await Linking.openURL(data.link);

      if (document?.quote.status === 'rascunho') {
        await quotesApi.changeStatus(quoteId, 'enviado', 'Enviada pelo WhatsApp');
        await load();
      }
    } catch {
      Alert.alert('Ops', 'Nao foi possivel abrir o WhatsApp.');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: string, label: string) {
    Alert.alert(label, 'Confirma essa mudanca?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setBusy(true);
          try {
            await quotesApi.changeStatus(quoteId, status);
            await load();
          } catch (statusError) {
            Alert.alert('Ops', statusError instanceof ApiError ? statusError.message : 'Nao foi possivel atualizar.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Proposta" />
        <LoadingState />
      </Screen>
    );
  }

  if (error || !document) {
    return (
      <Screen>
        <ScreenHeader title="Proposta" />
        <ErrorState message={error ?? 'Proposta nao encontrada.'} onRetry={() => void load()} />
      </Screen>
    );
  }

  const { quote, company } = document;
  const isOpen = ['rascunho', 'enviado', 'visualizado'].includes(quote.status);

  return (
    <Screen scroll>
      <ScreenHeader
        title={quote.code}
        subtitle={quote.type === 'proposta' ? 'Proposta' : 'Orcamento'}
        action={
          isOpen
            ? { icon: 'edit-2', label: 'Editar', onPress: () => router.push(`/proposta/nova?quoteId=${quoteId}`) }
            : undefined
        }
      />

      <Card style={styles.document}>
        <View style={styles.docHeader}>
          <Text style={styles.brand}>{company?.tradeName || 'Clyvo'}</Text>
          <Badge label={quote.statusLabel} tone={STATUS_TONE[quote.status] ?? 'neutro'} />
        </View>

        <Text style={styles.docLabel}>Cliente</Text>
        <Text style={styles.clientName}>{quote.clientName}</Text>

        <Text style={[styles.docLabel, styles.spaced]}>Itens</Text>
        {quote.items.map((item, index) => (
          <View key={item.id ?? index} style={styles.item}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.description}</Text>
              {item.quantity > 1 ? (
                <Text style={styles.itemMeta}>
                  {item.quantity} x {currency(item.unitPrice)}
                </Text>
              ) : null}
            </View>
            <Text style={styles.itemTotal}>
              {currency(item.total ?? item.quantity * item.unitPrice - item.discount)}
            </Text>
          </View>
        ))}

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{currency(quote.subtotal)}</Text>
          </View>
          {quote.discountAmount > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Desconto</Text>
              <Text style={styles.discount}>- {currency(quote.discountAmount)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.grandTotal}>
          <Text style={styles.grandLabel}>TOTAL</Text>
          <Text style={styles.grandValue}>{currency(quote.total)}</Text>
        </View>

        <View style={styles.details}>
          {quote.deliveryTime ? <Detail label="Prazo" value={quote.deliveryTime} /> : null}
          {quote.warranty ? <Detail label="Garantia" value={quote.warranty} /> : null}
          {quote.paymentMethods ? <Detail label="Pagamento" value={quote.paymentMethods} /> : null}
          {quote.validUntil ? (
            <Detail label="Validade" value={new Date(quote.validUntil).toLocaleDateString('pt-BR')} />
          ) : null}
        </View>

        {quote.notes ? (
          <>
            <Text style={[styles.docLabel, styles.spaced]}>Observacoes</Text>
            <Text style={styles.notes}>{quote.notes}</Text>
          </>
        ) : null}
      </Card>

      <View style={styles.actions}>
        <Button label="Enviar pelo WhatsApp" icon="message-circle" onPress={sendWhatsapp} loading={busy} />

        <View style={styles.actionRow}>
          <Button
            label="Gerar PDF"
            variant="outline"
            icon="file-text"
            onPress={() => void generatePdf(true)}
            style={styles.grow}
          />
          <Button
            label="Imprimir"
            variant="outline"
            icon="printer"
            onPress={() => void generatePdf(false)}
            style={styles.grow}
          />
        </View>
      </View>

      {isOpen ? (
        <>
          <Text style={styles.sectionTitle}>Resultado</Text>
          <View style={styles.actionRow}>
            <Button
              label="Cliente aceitou"
              icon="check"
              onPress={() => void changeStatus('aceito', 'Marcar como aceita')}
              style={styles.grow}
            />
            <Button
              label="Recusou"
              variant="danger"
              icon="x"
              onPress={() => void changeStatus('recusado', 'Marcar como recusada')}
              style={styles.grow}
            />
          </View>
          <Text style={styles.hint}>
            Aceitando, a venda e registrada e a oportunidade vai para "Fechado" automaticamente.
          </Text>
        </>
      ) : null}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  useThemeMode();
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = createThemedStyles(() => ({
  document: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  brand: {
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  docLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  spaced: { marginTop: theme.spacing.lg },
  clientName: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginTop: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  itemInfo: { flex: 1 },
  itemName: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  itemMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  itemTotal: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  totalsBox: {
    paddingTop: theme.spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  totalValue: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  discount: {
    ...theme.typography.body,
    color: theme.colors.success,
  },
  grandTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  grandLabel: {
    ...theme.typography.caption,
    color: theme.colors.onPrimaryMuted,
    letterSpacing: 1.2,
  },
  grandValue: {
    ...theme.typography.h2,
    color: theme.colors.onPrimary,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  detail: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.md,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.sm,
    minWidth: 110,
  },
  detailLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  detailValue: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  notes: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xxs,
  },
  actions: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  grow: { flex: 1 },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    paddingTop: theme.spacing.xs,
  },
}));
