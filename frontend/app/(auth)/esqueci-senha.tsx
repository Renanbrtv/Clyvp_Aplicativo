import { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { authApi } from '../../src/shared/api/auth.api';
import { ApiError } from '../../src/shared/api/types';
import { Button, Input, Screen } from '../../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';

export default function EsqueciSenhaScreen() {
  useThemeMode();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);

    if (!email.trim()) {
      setError('Informe o seu e-mail.');
      return;
    }

    setLoading(true);

    try {
      const result = await authApi.forgotPassword(email.trim());
      setDevToken(result?.devToken ?? null);
      setSent(true);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Nao foi possivel enviar agora. Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Screen scroll>
        <View style={styles.successBox}>
          <View style={styles.successIcon}>
            <Feather name="mail" size={28} color={theme.colors.primaryInk} />
          </View>
          <Text style={styles.title}>Confira seu e-mail</Text>
          <Text style={styles.subtitle}>
            Se existir uma conta com {email.trim()} e o envio for concluido, voce recebera as instrucoes para criar uma nova senha. Confira o spam; se nao chegar em alguns minutos, tente novamente.
          </Text>

          {devToken ? (
            <View style={styles.devBox}>
              <Text style={styles.devTitle}>Modo desenvolvimento</Text>
              <Text style={styles.devText}>
                O envio de e-mail ainda nao esta ligado. Enquanto isso, use este token para redefinir
                a senha em Tenho um codigo:
              </Text>
              <Text style={styles.devToken} selectable>
                {devToken}
              </Text>
            </View>
          ) : null}

          <Link href="/redefinir-senha" style={styles.link}>Tenho um codigo</Link>
          <Link href="/(auth)/login" style={styles.link}>
            Voltar para o login
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAware>
      <View style={styles.header}>
        <Text style={styles.title}>Recuperar senha</Text>
        <Text style={styles.subtitle}>
          Informe o e-mail da sua conta e enviaremos as instrucoes.
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="E-mail"
          icon="mail"
          placeholder="voce@email.com"
          value={email}
          onChangeText={setEmail}
          keyboard="email-address"
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
        />

        {error ? <Text style={styles.formError}>{error}</Text> : null}

        <Button label="Enviar instrucoes" onPress={handleSubmit} loading={loading} />

        <Link href="/redefinir-senha" style={styles.linkCenter}>Tenho um codigo</Link>
        <Link href="/(auth)/login" style={styles.linkCenter}>
          Voltar para o login
        </Link>
      </View>
    </Screen>
  );
}

const styles = createThemedStyles(() => ({
  header: {
    paddingTop: theme.spacing.xxxl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.xxs,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    gap: theme.spacing.md,
  },
  formError: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  link: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primaryInk,
    marginTop: theme.spacing.md,
  },
  linkCenter: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primaryInk,
    textAlign: 'center',
  },
  successBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xxxl,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSoft,
    marginBottom: theme.spacing.xs,
  },
  devBox: {
    width: '100%',
    backgroundColor: theme.colors.warningSoft,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    gap: theme.spacing.xxs,
    marginTop: theme.spacing.md,
  },
  devTitle: {
    ...theme.typography.badge,
    color: theme.colors.warning,
  },
  devText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
  },
  devToken: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginTop: theme.spacing.xxs,
  },
}));
