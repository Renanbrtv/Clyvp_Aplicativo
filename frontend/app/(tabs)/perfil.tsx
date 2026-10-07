import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { useAuth } from '../../src/features/auth/auth-context';
import { api } from '../../src/shared/api/client';
import { AppHeader, Avatar, Badge, Button, Card, Screen } from '../../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';
import { currency, phone } from '../../src/shared/utils/format';

/** Versao lida do app.json - nao precisa ser atualizada na mao aqui. */
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function PerfilScreen() {
  useThemeMode();
  const { account, user, logout } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;

  const plan = account?.subscription?.plan;
  const company = account?.company;

  function confirmLogout() {
    Alert.alert('Sair da conta', 'Voce vai precisar entrar de novo com e-mail e senha.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await logout();
          setLoggingOut(false);
        },
      },
    ]);
  }

  return (
    <Screen scroll bottomInset={theme.size.tabBar}>
      <AppHeader userName={user.name} />

      <View style={styles.identity}>
        <Avatar name={user.name} size={72} brand />
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        {plan ? (
          <Badge
            label={
              account?.subscription?.isFounder ? `Plano ${plan.name} · Fundador` : `Plano ${plan.name}`
            }
            tone={plan.code === 'free' ? 'neutro' : 'recorrente'}
            icon={plan.code === 'free' ? undefined : 'award'}
          />
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Trabalho e oportunidades</Text>
      <Card style={styles.card}>
        <LinkRow icon="user" label="Meu perfil profissional" onPress={() => router.push('/mercado/perfil-profissional')} />
        <LinkRow icon="search" label="Encontrar oportunidades" onPress={() => router.push('/mercado')} />
        <LinkRow icon="briefcase" label="Minhas propostas e trabalhos" onPress={() => router.push('/mercado/minhas')} />
        <LinkRow icon="bar-chart-2" label="Meus ganhos e metas" onPress={() => router.push('/mercado/ganhos')} />
        <LinkRow icon="target" label="Meu objetivo no Clyvo" onPress={() => router.push('/mercado/comecar')} />
        <LinkRow icon="help-circle" label="Ajuda e suporte" onPress={() => router.push('/suporte')} />
        <LinkRow icon="edit-3" label="Enviar sugestao" onPress={() => router.push('/sugestoes')} />
        <LinkRow icon="user-x" label="Usuarios bloqueados" onPress={() => router.push('/mercado/bloqueados')} />
        <LinkRow icon="shield" label="Regras do marketplace" onPress={() => router.push('/regras-mercado')} last />
      </Card>
      <Text style={styles.sectionTitle}>Atalhos</Text>
      <Card style={styles.card}>
        <LinkRow icon="bell" label="Lembretes no celular" onPress={() => router.push('/lembretes-celular')} />
        <LinkRow icon="moon" label="Aparencia" onPress={() => router.push('/aparencia')} />
        <LinkRow icon="message-circle" label="Perguntar a Cly" onPress={() => router.push('/cly')} />
        <LinkRow icon="package" label="Catalogo" onPress={() => router.push('/catalogo')} />
        <LinkRow icon="bell" label="Follow-ups" onPress={() => router.push('/follow-ups')} />
        <LinkRow
          icon="refresh-cw"
          label="Recuperar clientes"
          onPress={() => router.push('/recuperacao')}
        />
        <LinkRow icon="inbox" label="Notificacoes" onPress={() => router.push('/notificacoes')} />
        <LinkRow icon="award" label="Planos e assinatura" onPress={() => router.push('/planos')} last />
      </Card>

      <Text style={styles.sectionTitle}>Seu negocio</Text>
      <Card style={styles.card}>
        <Row icon="briefcase" label="Nome" value={company?.tradeName ?? 'Nao informado'} />
        <Row icon="phone" label="WhatsApp" value={phone(user.whatsapp ?? user.phone) || 'Nao informado'} />
        <Row
          icon="map-pin"
          label="Cidade"
          value={
            company?.address.city
              ? `${company.address.city}${company.address.state ? ` - ${company.address.state}` : ''}`
              : 'Nao informada'
          }
        />
        <Row icon="hash" label="CNPJ / CPF" value={company?.document ?? 'Nao informado'} last />
      </Card>

      {plan ? (
        <>
          <Text style={styles.sectionTitle}>Seu plano</Text>
          <Card style={styles.card}>
            <Row
              icon="award"
              label={plan.name}
              value={
                account?.subscription?.pricePaid && account.subscription.pricePaid > 0
                  ? `${currency(account.subscription.pricePaid, { cents: true })} por mes`
                  : plan.price > 0
                    ? `${currency(plan.price, { cents: true })} por mes`
                    : 'Gratuito'
              }
            />
            <Row
              icon="users"
              label="Clientes"
              value={plan.limits.maxClients === null ? 'Ilimitados' : `Ate ${plan.limits.maxClients}`}
            />
            <Row
              icon="file-text"
              label="Propostas por mes"
              value={
                plan.limits.maxQuotesPerMonth === null
                  ? 'Ilimitadas'
                  : `Ate ${plan.limits.maxQuotesPerMonth}`
              }
              last
            />
          </Card>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Sobre</Text>
      <Card style={styles.card}>
        <LinkRow
          icon="shield"
          label="Politica de Privacidade"
          onPress={() => router.push('/privacidade')}
        />
        <LinkRow icon="file-text" label="Termos de Uso" onPress={() => router.push('/termos')} last />
      </Card>

      <Text style={styles.sectionTitle}>Minha conta</Text>
      <Card style={styles.card}>
        <LinkRow icon="download" label="Exportar meus dados" onPress={() => router.push('/exportar-dados')} />
        <LinkRow icon="edit" label="Editar perfil e empresa" onPress={() => router.push('/editar-perfil')} />
        <LinkRow icon="trash-2" label="Excluir conta e dados" onPress={() => router.push('/excluir-conta')} last />
      </Card>

      <Button
        label="Sair da conta"
        variant="danger"
        icon="log-out"
        loading={loggingOut}
        onPress={confirmLogout}
        style={styles.logout}
      />

      <Text style={styles.version}>Clyvo {APP_VERSION}</Text>
    </Screen>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  last = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  useThemeMode();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.rowIcon}>
        <Feather name={icon} size={18} color={theme.colors.primaryInk} />
      </View>
      <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{label}</Text>
      <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
    </Pressable>
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
      <View style={styles.rowIcon}>
        <Feather name={icon} size={18} color={theme.colors.primaryInk} />
      </View>
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
    gap: theme.spacing.xxs,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  name: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  email: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  card: {
    padding: 0,
  },
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
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSoft,
  },
  rowLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  rowValue: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
    flexShrink: 1,
    maxWidth: '55%',
    textAlign: 'right',
  },
  logout: {
    marginTop: theme.spacing.xxl,
  },
  version: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingTop: theme.spacing.md,
  },
}));
