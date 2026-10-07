import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { catalogApi } from '../../src/shared/api/resources.api';
import { ApiError } from '../../src/shared/api/types';
import { Button, Input, LoadingState, Screen, ScreenHeader } from '../../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';

import { parseDecimal as parseNumber } from '../../src/shared/utils/number';

export default function ServicoFormScreen() {
  useThemeMode();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;

  const [loading, setLoading] = useState(Boolean(editingId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', price: '', minutes: '', warranty: '', description: '' });

  const set = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!editingId) return;
    (async () => {
      try {
        const data = await catalogApi.getService(editingId);
        setForm({
          name: data.service.name,
          price: String(data.service.price),
          minutes: data.service.estimatedTimeMinutes ? String(data.service.estimatedTimeMinutes) : '',
          warranty: data.service.warrantyDays ? String(data.service.warrantyDays) : '',
          description: data.service.description ?? '',
        });
      } catch {
        setError('Nao foi possivel carregar o servico.');
      } finally {
        setLoading(false);
      }
    })();
  }, [editingId]);

  async function handleSubmit() {
    setError(null);

    if (form.name.trim().length < 2) {
      setError('Informe o nome do servico.');
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      price: parseNumber(form.price),
      estimatedTimeMinutes: form.minutes ? Number(form.minutes) : null,
      warrantyDays: form.warranty ? Number(form.warranty) : null,
      description: form.description.trim() || null,
    };

    try {
      if (editingId) await catalogApi.updateService(editingId, payload);
      else await catalogApi.createService(payload);
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
    Alert.alert('Excluir servico', 'Ele some do catalogo. Propostas antigas continuam intactas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await catalogApi.removeService(editingId);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Servico" />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAware>
      <ScreenHeader title={editingId ? 'Editar servico' : 'Novo servico'} />

      <View style={styles.form}>
        <Input
          label="Nome"
          icon="tool"
          placeholder="Instalacao de camera"
          value={form.name}
          onChangeText={set('name')}
        />
        <Input
          label="Preco"
          icon="dollar-sign"
          placeholder="250"
          keyboard="numeric"
          value={form.price}
          onChangeText={set('price')}
        />
        <Input
          label="Tempo estimado (minutos)"
          icon="clock"
          placeholder="240"
          keyboard="numeric"
          value={form.minutes}
          onChangeText={set('minutes')}
          hint="Opcional. Ajuda a organizar a agenda."
        />
        <Input
          label="Garantia (dias)"
          icon="shield"
          placeholder="90"
          keyboard="numeric"
          value={form.warranty}
          onChangeText={set('warranty')}
        />
        <Input
          label="Descricao"
          icon="file-text"
          placeholder="O que esta incluso no servico"
          value={form.description}
          onChangeText={set('description')}
          multiline
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label={editingId ? 'Salvar' : 'Cadastrar servico'} onPress={handleSubmit} loading={saving} />

        {editingId ? (
          <Button label="Excluir servico" variant="danger" icon="trash-2" onPress={confirmDelete} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = createThemedStyles(() => ({
  form: { gap: theme.spacing.md, paddingTop: theme.spacing.md },
  error: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
}));
