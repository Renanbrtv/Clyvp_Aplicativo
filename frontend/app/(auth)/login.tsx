import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../src/features/auth/auth-context';
import { ApiError } from '../../src/shared/api/types';
import { Button, Input, Logo, Screen } from '../../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';

export default function LoginScreen() {
  useThemeMode();
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    setFormError(null);
    setFieldErrors({});

    if (!email.trim() || !password) {
      setFormError('Informe o e-mail e a senha.');
      return;
    }

    setLoading(true);

    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch (error) {
      if (error instanceof ApiError) {
        const details: Record<string, string> = {};
        error.details?.forEach((item) => {
          details[item.field] = item.message;
        });
        setFieldErrors(details);
        setFormError(error.message);
      } else {
        setFormError('Nao foi possivel entrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll keyboardAware>
      <View style={styles.header}>
        <Logo size={38} />
        <Text style={styles.title}>Bem-vindo de volta</Text>
        <Text style={styles.subtitle}>Entre para continuar transformando conversas em vendas.</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="E-mail"
          icon="mail"
          placeholder="voce@email.com"
          value={email}
          onChangeText={setEmail}
          keyboard="email-address"
          autoComplete="email"
          error={fieldErrors.email}
        />

        <Input
          label="Senha"
          icon="lock"
          placeholder="Sua senha"
          value={password}
          onChangeText={setPassword}
          secure
          autoComplete="password"
          error={fieldErrors.password}
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
        />

        <Link href="/(auth)/esqueci-senha" style={styles.link}>
          Esqueci minha senha
        </Link>

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <Button label="Entrar" onPress={handleSubmit} loading={loading} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Ainda nao tem conta?</Text>
        <Link href="/(auth)/cadastro" style={styles.footerLink}>
          Criar conta gratis
        </Link>
      </View>
    <Button label="Ajuda e suporte" variant="ghost" onPress={() => router.push('/suporte')} />
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
    marginTop: theme.spacing.lg,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  form: {
    gap: theme.spacing.md,
  },
  link: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primaryInk,
    alignSelf: 'flex-end',
  },
  formError: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xxs,
    paddingTop: theme.spacing.xxl,
  },
  footerText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  footerLink: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primaryInk,
  },
}));
