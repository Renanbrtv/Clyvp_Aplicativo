import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { catalogApi } from '../../src/shared/api/resources.api';
import { ApiError } from '../../src/shared/api/types';
import { Button, Input, LoadingState, Screen, ScreenHeader } from '../../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';

import { parseDecimal as parseNumber } from '../../src/shared/utils/number';

export default function ProdutoFormScreen() {
  useThemeMode();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;

  const [loading, setLoading] = useState(Boolean(editingId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackStock, setTrackStock] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', price: '', promoPrice: '', stock: '', description: '' });

  const set = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!editingId) return;
    (async () => {
      try {
        const data = await catalogApi.getProduct(editingId);
        setForm({
          name: data.product.name,
          sku: data.product.sku ?? '',
          price: String(data.product.price),
          promoPrice: data.product.promoPrice ? String(data.product.promoPrice) : '',
          stock: String(data.product.stock),
          description: data.product.description ?? '',
        });
        setTrackStock(data.product.trackStock);
      } catch {
        setError('Nao foi possivel carregar o produto.');
      } finally {
        setLoading(false);
      }
    })();
  }, [editingId]);

  async function handleSubmit() {
    setError(null);

    if (form.name.trim().length < 2) {
      setError('Informe o nome do produto.');
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      price: parseNumber(form.price),
      promoPrice: form.promoPrice ? parseNumber(form.promoPrice) : null,
      trackStock,
      stock: trackStock ? Number(form.stock) || 0 : 0,
      description: form.description.trim() || null,
    };

    try {
      if (editingId) await catalogApi.updateProduct(editingId, payload);
      else await catalogApi.createProduct(payload);
      router.back();
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
        if (submitError.code === 'PLAN_LIMIT_REACHED') Alert.alert('Limite do plano', submitError.message);
      } else {
        setError('Nao foi possivel salvar.');
      }
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!editingId) return;
    Alert.alert('Excluir produto', 'Ele some do catalogo. Propostas antigas continuam intactas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await catalogApi.removeProduct(editingId);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Produto" />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAware>
      <ScreenHeader title={editingId ? 'Editar produto' : 'Novo produto'} />

      <View style={styles.form}>
        <Input
          label="Nome"
          icon="package"
          placeholder="iPhone 15 128GB"
          value={form.name}
          onChangeText={set('name')}
        />
        <Input label="Codigo / SKU" icon="hash" placeholder="Opcional" value={form.sku} onChangeText={set('sku')} />
        <Input
          label="Preco"
          icon="dollar-sign"
          placeholder="3499"
          keyboard="numeric"
          value={form.price}
          onChangeText={set('price')}
        />
        <Input
          label="Preco promocional"
          icon="tag"
          placeholder="Opcional"
          keyboard="numeric"
          value={form.promoPrice}
          onChangeText={set('promoPrice')}
          hint="Precisa ser menor que o preco normal."
        />

        <Pressable onPress={() => setTrackStock((value) => !value)} style={styles.toggle}>
          <View style={[styles.checkbox, trackStock && styles.checkboxActive]}>
            {trackStock ? <Feather name="check" size={14} color={theme.colors.onPrimary} /> : null}
          </View>
          <View style={styles.grow}>
            <Text style={styles.toggleLabel}>Controlar estoque</Text>
            <Text style={styles.toggleHint}>O app avisa quando o estoque zerar.</Text>
          </View>
        </Pressable>

        {trackStock ? (
          <Input
            label="Quantidade em estoque"
            icon="layers"
            placeholder="0"
            keyboard="numeric"
            value={form.stock}
            onChangeText={set('stock')}
          />
        ) : null}

        <Input
          label="Descricao"
          icon="file-text"
          placeholder="Detalhes do produto"
          value={form.description}
          onChangeText={set('description')}
          multiline
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label={editingId ? 'Salvar' : 'Cadastrar produto'} onPress={handleSubmit} loading={saving} />

        {editingId ? (
          <Button label="Excluir produto" variant="danger" icon="trash-2" onPress={confirmDelete} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = createThemedStyles(() => ({
  form: { gap: theme.spacing.md, paddingTop: theme.spacing.md },
  grow: { flex: 1 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceSoft,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.borderPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  toggleLabel: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  toggleHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
}));
