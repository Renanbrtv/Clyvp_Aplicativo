import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { clientsApi, type ClientPayload } from '../../src/shared/api/resources.api';
import { ApiError } from '../../src/shared/api/types';
import { Button, Input, LoadingState, Screen, ScreenHeader } from '../../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';
import { onlyDigits } from '../../src/shared/utils/format';

/** Cadastro e edicao de cliente. Com ?id=, edita. */
export default function ClienteFormScreen() {
  useThemeMode();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : null;

  const [loading, setLoading] = useState(Boolean(editingId));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: '',
    whatsapp: '',
    email: '',
    document: '',
    city: '',
    state: '',
    notes: '',
  });

  const set = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!editingId) return;

    (async () => {
      try {
        const data = await clientsApi.detail(editingId);
        setForm({
          name: data.client.name,
          whatsapp: data.client.whatsapp ?? data.client.phone ?? '',
          email: data.client.email ?? '',
          document: data.client.document ?? '',
          city: data.client.address.city ?? '',
          state: data.client.address.state ?? '',
          notes: data.client.notes ?? '',
        });
      } catch {
        setFormError('Nao foi possivel carregar o cliente.');
      } finally {
        setLoading(false);
      }
    })();
  }, [editingId]);

  async function handleSubmit() {
    setFormError(null);
    setFieldErrors({});

    if (form.name.trim().length < 2) {
      setFieldErrors({ name: 'Informe o nome do cliente.' });
      return;
    }

    setSaving(true);

    const payload: ClientPayload = {
      name: form.name.trim(),
      whatsapp: form.whatsapp ? onlyDigits(form.whatsapp) : null,
      phone: form.whatsapp ? onlyDigits(form.whatsapp) : null,
      email: form.email.trim() || null,
      document: form.document ? onlyDigits(form.document) : null,
      city: form.city.trim() || null,
      state: form.state.trim() ? form.state.trim().toUpperCase() : null,
      notes: form.notes.trim() || null,
    };

    try {
      if (editingId) {
        await clientsApi.update(editingId, payload);
        router.back();
      } else {
        const created = await clientsApi.create(payload);
        router.replace(`/cliente/${created.client.id}`);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        const details: Record<string, string> = {};
        error.details?.forEach((item) => {
          details[item.field] = item.message;
        });
        setFieldErrors(details);
        setFormError(error.message);

        if (error.code === 'PLAN_LIMIT_REACHED') {
          Alert.alert('Limite do plano', error.message, [{ text: 'Agora nao', style: 'cancel' }, { text: 'Ver planos', onPress: () => router.push('/planos') }]);
        }
      } else {
        setFormError('Nao foi possivel salvar. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Editar cliente" />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAware>
      <ScreenHeader
        title={editingId ? 'Editar cliente' : 'Novo cliente'}
        subtitle={editingId ? undefined : 'So o nome ja basta para comecar.'}
      />

      <View style={styles.form}>
        <Input
          label="Nome"
          icon="user"
          placeholder="Nome do cliente"
          value={form.name}
          onChangeText={set('name')}
          error={fieldErrors.name}
        />

        <Input
          label="WhatsApp"
          icon="phone"
          placeholder="(62) 99999-1234"
          value={form.whatsapp}
          onChangeText={set('whatsapp')}
          keyboard="phone-pad"
          hint="Usado para abrir a conversa direto do app."
          error={fieldErrors.whatsapp ?? fieldErrors.phone}
        />

        <Input
          label="E-mail"
          icon="mail"
          placeholder="cliente@email.com"
          value={form.email}
          onChangeText={set('email')}
          keyboard="email-address"
          error={fieldErrors.email}
        />

        <Input
          label="CPF ou CNPJ"
          icon="hash"
          placeholder="Opcional"
          value={form.document}
          onChangeText={set('document')}
          keyboard="numeric"
          error={fieldErrors.document}
        />

        <View style={styles.row}>
          <View style={styles.grow}>
            <Input label="Cidade" icon="map-pin" placeholder="Opcional" value={form.city} onChangeText={set('city')} />
          </View>
          <View style={styles.state}>
            <Input label="UF" placeholder="GO" value={form.state} onChangeText={set('state')} maxLength={2} />
          </View>
        </View>

        <Input
          label="Observacoes"
          icon="file-text"
          placeholder="O que voce nao pode esquecer sobre esse cliente"
          value={form.notes}
          onChangeText={set('notes')}
          multiline
        />

        {formError ? <View><Text style={styles.formError}>{formError}</Text><Button label="Ver planos e beneficios" variant="ghost" onPress={() => router.push('/planos')} /></View> : null}

        <Button
          label={editingId ? 'Salvar alteracoes' : 'Cadastrar cliente'}
          onPress={handleSubmit}
          loading={saving}
        />
      </View>
    </Screen>
  );
}

const styles = createThemedStyles(() => ({
  form: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  grow: { flex: 1 },
  state: { width: 88 },
  formError: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
}));
