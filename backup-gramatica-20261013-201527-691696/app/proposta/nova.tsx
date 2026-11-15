import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { catalogApi, clientsApi, quotesApi } from '../../src/shared/api/resources.api';
import { ApiError, type Product, type ServiceItem } from '../../src/shared/api/types';
import {
  Button,
  Card,
  Input,
  LoadingState,
  Screen,
  ScreenHeader,
  SearchField,
} from '../../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';
import { currency } from '../../src/shared/utils/format';

interface DraftItem {
  key: string;
  itemType: 'produto' | 'servico' | 'avulso';
  productId?: number | null;
  serviceId?: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

import { parseDecimal as parseNumber } from '../../src/shared/utils/number';

export default function NovaPropostaScreen() {
  useThemeMode();
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string; opportunityId?: string; quoteId?: string }>();

  const clientId = params.clientId ? Number(params.clientId) : null;
  const opportunityId = params.opportunityId ? Number(params.opportunityId) : null;
  const editingId = params.quoteId ? Number(params.quoteId) : null;

  const [clientName, setClientName] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');

  const [type, setType] = useState<'orcamento' | 'proposta'>('proposta');
  const [discount, setDiscount] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [warranty, setWarranty] = useState('');
  const [paymentMethods, setPaymentMethods] = useState('Pix / cartao / dinheiro');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (editingId) {
          const data = await quotesApi.detail(editingId);
          const quote = data.quote;
          setClientName(quote.clientName);
          setType(quote.type);
          setDiscount(quote.discountValue > 0 ? String(quote.discountValue) : '');
          setDeliveryTime(quote.deliveryTime ?? '');
          setWarranty(quote.warranty ?? '');
          setPaymentMethods(quote.paymentMethods ?? '');
          setNotes(quote.notes ?? '');
          setItems(
            quote.items.map((item, index) => ({
              key: `item-${index}`,
              itemType: item.itemType,
              productId: item.productId,
              serviceId: item.serviceId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
            })),
          );
        } else if (clientId) {
          const data = await clientsApi.detail(clientId);
          setClientName(data.client.name);
        }

        const catalog = await catalogApi.full();
        setProducts(catalog.products);
        setServices(catalog.services);
      } catch {
        setError('Nao foi possivel carregar os dados.');
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId, editingId]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + Math.max(0, item.quantity * item.unitPrice - item.discount),
      0,
    );
    const discountValue = Math.min(parseNumber(discount), subtotal);
    return { subtotal, discountValue, total: subtotal - discountValue };
  }, [items, discount]);

  const filteredCatalog = useMemo(() => {
    const term = catalogSearch.trim().toLowerCase();
    const match = (name: string) => name.toLowerCase().includes(term);
    return {
      products: term ? products.filter((item) => match(item.name)) : products,
      services: term ? services.filter((item) => match(item.name)) : services,
    };
  }, [catalogSearch, products, services]);

  function addFromCatalog(entry: { id: number; name: string; price: number }, kind: 'produto' | 'servico') {
    setItems((prev) => [
      ...prev,
      {
        key: `${kind}-${entry.id}-${Date.now()}`,
        itemType: kind,
        productId: kind === 'produto' ? entry.id : null,
        serviceId: kind === 'servico' ? entry.id : null,
        description: entry.name,
        quantity: 1,
        unitPrice: entry.price,
        discount: 0,
      },
    ]);
    setCatalogOpen(false);
    setCatalogSearch('');
  }

  function addBlankItem() {
    setItems((prev) => [
      ...prev,
      {
        key: `avulso-${Date.now()}`,
        itemType: 'avulso',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
      },
    ]);
    setCatalogOpen(false);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  async function handleSubmit() {
    setError(null);

    if (!clientId && !editingId) {
      setError('Escolha um cliente antes de montar a proposta.');
      return;
    }

    if (items.length === 0) {
      setError('Adicione ao menos um item.');
      return;
    }

    if (items.some((item) => item.description.trim().length === 0)) {
      setError('Todos os itens precisam de uma descricao.');
      return;
    }

    setSaving(true);

    const payloadItems = items.map((item) => ({
      itemType: item.itemType,
      productId: item.productId ?? null,
      serviceId: item.serviceId ?? null,
      description: item.description.trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
    }));

    try {
      if (editingId) {
        await quotesApi.update(editingId, {
          type,
          discountType: 'valor',
          discountAmount: totals.discountValue,
          deliveryTime: deliveryTime.trim() || null,
          warranty: warranty.trim() || null,
          paymentMethods: paymentMethods.trim() || null,
          notes: notes.trim() || null,
          items: payloadItems,
        });
        router.replace(`/proposta/${editingId}`);
      } else {
        const created = await quotesApi.create({
          clientId: clientId as number,
          opportunityId,
          type,
          discountType: 'valor',
          discountAmount: totals.discountValue,
          deliveryTime: deliveryTime.trim() || null,
          warranty: warranty.trim() || null,
          paymentMethods: paymentMethods.trim() || null,
          notes: notes.trim() || null,
          items: payloadItems,
        });
        router.replace(`/proposta/${created.quote.id}`);
      }
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
        if (submitError.code === 'PLAN_LIMIT_REACHED') {
          Alert.alert('Limite do plano', submitError.message);
        }
      } else {
        setError('Nao foi possivel salvar a proposta.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Nova proposta" />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <>
      <Screen scroll keyboardAware>
        <ScreenHeader title={editingId ? 'Editar proposta' : 'Nova proposta'} subtitle={clientName} />

        <View style={styles.typeRow}>
          {(['orcamento', 'proposta'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setType(option)}
              style={[styles.typeChip, type === option && styles.typeChipActive]}
            >
              <Text style={[styles.typeLabel, type === option && styles.typeLabelActive]}>
                {option === 'orcamento' ? 'Orcamento' : 'Proposta'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Itens</Text>
          <Pressable onPress={() => setCatalogOpen(true)} hitSlop={theme.hitSlop}>
            <Text style={styles.addLink}>+ Adicionar</Text>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <Pressable onPress={() => setCatalogOpen(true)} style={styles.emptyItems}>
            <Feather name="plus-circle" size={22} color={theme.colors.primary} />
            <Text style={styles.emptyItemsText}>Adicionar produto ou servico</Text>
          </Pressable>
        ) : (
          <View style={styles.itemList}>
            {items.map((item) => (
              <Card key={item.key} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Input
                    placeholder="Descricao do item"
                    value={item.description}
                    onChangeText={(value) => updateItem(item.key, { description: value })}
                  />
                </View>

                <View style={styles.itemFields}>
                  <View style={styles.qty}>
                    <Text style={styles.fieldLabel}>Qtd</Text>
                    <View style={styles.stepper}>
                      <Pressable
                        onPress={() => updateItem(item.key, { quantity: Math.max(1, item.quantity - 1) })}
                        hitSlop={theme.hitSlop}
                      >
                        <Feather name="minus" size={18} color={theme.colors.primaryInk} />
                      </Pressable>
                      <Text style={styles.qtyValue}>{item.quantity}</Text>
                      <Pressable
                        onPress={() => updateItem(item.key, { quantity: item.quantity + 1 })}
                        hitSlop={theme.hitSlop}
                      >
                        <Feather name="plus" size={18} color={theme.colors.primaryInk} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.grow}>
                    <Input
                      label="Valor unitario"
                      placeholder="0"
                      keyboard="numeric"
                      value={item.unitPrice ? String(item.unitPrice) : ''}
                      onChangeText={(value) => updateItem(item.key, { unitPrice: parseNumber(value) })}
                    />
                  </View>
                </View>

                <View style={styles.itemFooter}>
                  <Pressable onPress={() => removeItem(item.key)} hitSlop={theme.hitSlop}>
                    <Text style={styles.remove}>Remover</Text>
                  </Pressable>
                  <Text style={styles.itemTotal}>
                    {currency(Math.max(0, item.quantity * item.unitPrice - item.discount))}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Condicoes</Text>
        <View style={styles.form}>
          <Input
            label="Desconto"
            icon="tag"
            placeholder="0"
            keyboard="numeric"
            value={discount}
            onChangeText={setDiscount}
          />
          <Input label="Prazo" icon="clock" placeholder="2 dias" value={deliveryTime} onChangeText={setDeliveryTime} />
          <Input label="Garantia" icon="shield" placeholder="90 dias" value={warranty} onChangeText={setWarranty} />
          <Input
            label="Forma de pagamento"
            icon="credit-card"
            placeholder="Pix / cartao / dinheiro"
            value={paymentMethods}
            onChangeText={setPaymentMethods}
          />
          <Input
            label="Observacoes"
            icon="file-text"
            placeholder="O que esta incluso"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        <Card tone="soft" style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{currency(totals.subtotal)}</Text>
          </View>
          {totals.discountValue > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Desconto</Text>
              <Text style={styles.summaryDiscount}>- {currency(totals.discountValue)}</Text>
            </View>
          ) : null}
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>{currency(totals.total)}</Text>
          </View>
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={editingId ? 'Salvar proposta' : 'Criar proposta'}
          onPress={handleSubmit}
          loading={saving}
          style={styles.submit}
        />
      </Screen>

      <Modal visible={catalogOpen} animationType="slide" onRequestClose={() => setCatalogOpen(false)}>
        <Screen>
          <ScreenHeader title="Adicionar item" onBack={() => setCatalogOpen(false)} />

          <SearchField value={catalogSearch} onChangeText={setCatalogSearch} placeholder="Buscar no catalogo" />

          <ScrollView style={styles.catalogList} showsVerticalScrollIndicator={false}>
            <Pressable onPress={addBlankItem} style={styles.catalogBlank}>
              <Feather name="edit-3" size={18} color={theme.colors.primary} />
              <Text style={styles.catalogBlankText}>Item avulso (digitar na hora)</Text>
            </Pressable>

            {filteredCatalog.services.length > 0 ? (
              <Text style={styles.catalogSection}>Servicos</Text>
            ) : null}
            {filteredCatalog.services.map((service) => (
              <Pressable
                key={`s-${service.id}`}
                onPress={() => addFromCatalog(service, 'servico')}
                style={styles.catalogRow}
              >
                <View style={styles.grow}>
                  <Text style={styles.catalogName}>{service.name}</Text>
                  {service.warrantyDays ? (
                    <Text style={styles.catalogMeta}>Garantia de {service.warrantyDays} dias</Text>
                  ) : null}
                </View>
                <Text style={styles.catalogPrice}>{currency(service.price)}</Text>
              </Pressable>
            ))}

            {filteredCatalog.products.length > 0 ? (
              <Text style={styles.catalogSection}>Produtos</Text>
            ) : null}
            {filteredCatalog.products.map((product) => (
              <Pressable
                key={`p-${product.id}`}
                onPress={() =>
                  addFromCatalog({ ...product, price: product.promoPrice ?? product.price }, 'produto')
                }
                style={styles.catalogRow}
              >
                <View style={styles.grow}>
                  <Text style={styles.catalogName}>{product.name}</Text>
                  {product.trackStock ? (
                    <Text style={styles.catalogMeta}>Estoque: {product.stock}</Text>
                  ) : null}
                </View>
                <Text style={styles.catalogPrice}>{currency(product.promoPrice ?? product.price)}</Text>
              </Pressable>
            ))}

            {products.length === 0 && services.length === 0 ? (
              <Text style={styles.catalogEmpty}>
                Seu catalogo esta vazio. Cadastre produtos e servicos para montar propostas mais rapido.
              </Text>
            ) : null}
          </ScrollView>
        </Screen>
      </Modal>
    </>
  );
}

const styles = createThemedStyles(() => ({
  typeRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.md,
  },
  typeChip: {
    flex: 1,
    height: theme.size.chip,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceSoftStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipActive: { backgroundColor: theme.colors.primary },
  typeLabel: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  typeLabelActive: { color: theme.colors.onPrimary },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  addLink: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primaryInk,
  },
  emptyItems: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xl,
    borderRadius: theme.radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.borderPrimary,
    backgroundColor: theme.colors.surfaceSoft,
  },
  emptyItemsText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primaryInk,
  },
  itemList: { gap: theme.spacing.sm },
  itemCard: { gap: theme.spacing.sm },
  itemHeader: {},
  itemFields: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  qty: { width: 120, gap: theme.spacing.xxs },
  fieldLabel: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  stepper: {
    height: theme.size.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  qtyValue: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  grow: { flex: 1 },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remove: {
    ...theme.typography.caption,
    color: theme.colors.danger,
  },
  itemTotal: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  form: { gap: theme.spacing.md },
  summary: {
    marginTop: theme.spacing.xl,
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  summaryDiscount: {
    ...theme.typography.body,
    color: theme.colors.success,
  },
  summaryTotal: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderPrimary,
  },
  summaryTotalLabel: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  summaryTotalValue: {
    ...theme.typography.h2,
    color: theme.colors.primary,
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.md,
  },
  submit: { marginTop: theme.spacing.lg },
  catalogList: { flex: 1, marginTop: theme.spacing.sm },
  catalogBlank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceSoft,
    marginBottom: theme.spacing.sm,
  },
  catalogBlankText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primaryInk,
  },
  catalogSection: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  catalogName: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  catalogMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  catalogPrice: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primaryInk,
  },
  catalogEmpty: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: theme.spacing.xxl,
  },
}));
