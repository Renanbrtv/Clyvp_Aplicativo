import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { clientsApi, opportunitiesApi } from '../../src/shared/api/resources.api';
import { ApiError, type Client } from '../../src/shared/api/types';
import { Avatar, Button, Input, Screen, ScreenHeader, SearchField } from '../../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';
import { currency, onlyDigits } from '../../src/shared/utils/format';

/**
 * Fluxo rapido: escolher cliente (ou criar na hora), dar um titulo e um valor.
 * O detalhamento em itens acontece na proposta.
 */
export default function NovaOportunidadeScreen() {
  useThemeMode();
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string }>();

  const [step, setStep] = useState<'cliente' | 'dados'>(params.clientId ? 'dados' : 'cliente');
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Client | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const [newClient, setNewClient] = useState({ name: '', whatsapp: '' });
  const [form, setForm] = useState({ title: '', amount: '', description: '' });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const data = await clientsApi.list({ search: search || undefined });
        setClients(data.clients);
      } catch {
        setClients([]);
      }
    }, search ? 300 : 0);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!params.clientId) return;
    (async () => {
      try {
        const data = await clientsApi.detail(Number(params.clientId));
        setSelected(data.client);
      } catch {
        setStep('cliente');
      }
    })();
  }, [params.clientId]);

  async function handleSubmit() {
    setError(null);

    if (form.title.trim().length < 2) {
      setError('Descreva rapidamente o que o cliente quer.');
      return;
    }

    if (!selected && !creatingNew) {
      setError('Escolha um cliente.');
      return;
    }

    if (creatingNew && newClient.name.trim().length < 2) {
      setError('Informe o nome do novo cliente.');
      return;
    }

    setSaving(true);

    try {
      const amount = Number(form.amount.replace(/\./g, '').replace(',', '.')) || 0;

      const created = await opportunitiesApi.create({
        clientId: selected?.id,
        newClient: creatingNew
          ? {
              name: newClient.name.trim(),
              whatsapp: newClient.whatsapp ? onlyDigits(newClient.whatsapp) : null,
              phone: newClient.whatsapp ? onlyDigits(newClient.whatsapp) : null,
            }
          : undefined,
        title: form.title.trim(),
        description: form.description.trim() || null,
        totalAmount: amount,
      });

      router.replace(`/oportunidade/${created.opportunity.id}`);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
        if (submitError.code === 'PLAN_LIMIT_REACHED') {
          Alert.alert('Limite do plano', submitError.message);
        }
      } else {
        setError('Nao foi possivel criar a oportunidade.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (step === 'cliente') {
    return (
      <Screen scroll keyboardAware>
        <ScreenHeader title="Nova oportunidade" subtitle="Para quem e essa venda?" />

        <View style={styles.block}>
          <SearchField value={search} onChangeText={setSearch} placeholder="Buscar cliente" />

          <Pressable
            onPress={() => {
              setCreatingNew(true);
              setSelected(null);
              setStep('dados');
            }}
            style={({ pressed }) => [styles.newClient, pressed && styles.pressed]}
          >
            <View style={styles.newClientIcon}>
              <Feather name="user-plus" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.grow}>
              <Text style={styles.newClientLabel}>Cadastrar cliente novo</Text>
              <Text style={styles.newClientHint}>So o nome e o WhatsApp</Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.primaryInk} />
          </Pressable>

          {clients.map((client) => (
            <Pressable
              key={client.id}
              onPress={() => {
                setSelected(client);
                setCreatingNew(false);
                setStep('dados');
              }}
              style={({ pressed }) => [styles.clientRow, pressed && styles.pressed]}
            >
              <Avatar name={client.name} size={44} />
              <View style={styles.grow}>
                <Text style={styles.clientName} numberOfLines={1}>
                  {client.name}
                </Text>
                <Text style={styles.clientMeta}>
                  {client.purchasesCount > 0
                    ? `${client.purchasesCount} ${client.purchasesCount === 1 ? 'compra' : 'compras'} · ${currency(client.totalPurchased)}`
                    : 'Ainda nao comprou'}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ))}

          {clients.length === 0 && search.length > 0 ? (
            <Text style={styles.noResults}>Nenhum cliente encontrado. Cadastre um novo acima.</Text>
          ) : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAware>
      <ScreenHeader
        title="Nova oportunidade"
        subtitle={selected ? selected.name : 'Cliente novo'}
        onBack={() => setStep('cliente')}
      />

      <View style={styles.block}>
        {creatingNew ? (
          <>
            <Input
              label="Nome do cliente"
              icon="user"
              placeholder="Como ele se chama"
              value={newClient.name}
              onChangeText={(value) => setNewClient((prev) => ({ ...prev, name: value }))}
            />
            <Input
              label="WhatsApp"
              icon="phone"
              placeholder="(62) 99999-1234"
              value={newClient.whatsapp}
              onChangeText={(value) => setNewClient((prev) => ({ ...prev, whatsapp: value }))}
              keyboard="phone-pad"
            />
          </>
        ) : null}

        <Input
          label="O que o cliente quer"
          icon="clipboard"
          placeholder="Instalacao de 3 cameras"
          value={form.title}
          onChangeText={(value) => setForm((prev) => ({ ...prev, title: value }))}
        />

        <Input
          label="Valor estimado"
          icon="dollar-sign"
          placeholder="850"
          value={form.amount}
          onChangeText={(value) => setForm((prev) => ({ ...prev, amount: value }))}
          keyboard="numeric"
          hint="Da para ajustar depois ao montar a proposta."
        />

        <Input
          label="Observacoes"
          icon="file-text"
          placeholder="Detalhes que voce nao pode esquecer"
          value={form.description}
          onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
          multiline
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Criar oportunidade" onPress={handleSubmit} loading={saving} />
      </View>
    </Screen>
  );
}

const styles = createThemedStyles(() => ({
  block: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  grow: { flex: 1 },
  pressed: { opacity: 0.85 },
  newClient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surfaceSoft,
    marginTop: theme.spacing.xs,
  },
  newClientIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  newClientLabel: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  newClientHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clientName: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  clientMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  noResults: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
}));
