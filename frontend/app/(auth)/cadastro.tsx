import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../src/features/auth/auth-context';
import { ApiError } from '../../src/shared/api/types';
import { Button, Input, Screen } from '../../src/shared/components';
import { onlyDigits } from '../../src/shared/utils/format';
import { theme, useThemeMode, createThemedStyles } from '../../src/shared/theme';

export default function CadastroScreen() {
  useThemeMode();
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    setFormError(null);
    setFieldErrors({});

    if (!name.trim() || !email.trim() || !password) {
      setFormError('Preencha nome, e-mail e senha.');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        passwordConfirmation: password,
        phone: phone ? onlyDigits(phone) : null,
        companyName: companyName.trim() || null,
      });
      router.replace('/onboarding');
    } catch (error) {
      if (error instanceof ApiError) {
        const details: Record<string, string> = {};
        error.details?.forEach((item) => {
          details[item.field] = item.message;
        });
        setFieldErrors(details);
        setFormError(error.message);
      } else {
        setFormError('Nao foi possivel criar a conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll keyboardAware>
      <View style={styles.header}>
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>
          Leva menos de um minuto. Voce comeca no plano gratuito.
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Seu nome"
          icon="user"
          placeholder="Como seus clientes te chamam"
          value={name}
          onChangeText={setName}
          error={fieldErrors.name}
        />

        <Input
          label="E-mail"
          icon="mail"
          placeholder="voce@email.com"
          value={email}
          onChangeText={setEmail}
          keyboard="email-address"
          error={fieldErrors.email}
        />

        <Input
          label="WhatsApp"
          icon="phone"
          placeholder="(62) 99999-1234"
          value={phone}
          onChangeText={setPhone}
          keyboard="phone-pad"
          hint="Opcional. Usamos para montar os links de conversa."
          error={fieldErrors.phone}
        />

        <Input
          label="Nome do seu negocio"
          icon="briefcase"
          placeholder="Aparece nas suas propostas"
          value={companyName}
          onChangeText={setCompanyName}
          hint="Opcional. Da para mudar depois."
          error={fieldErrors.companyName}
        />

        <Input
          label="Senha"
          icon="lock"
          placeholder="Minimo 8 caracteres"
          value={password}
          onChangeText={setPassword}
          secure
          hint="Precisa ter pelo menos uma letra e um numero."
          error={fieldErrors.password}
        />

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <Button label="Criar minha conta" onPress={handleSubmit} loading={loading} />

        <Text style={styles.consent}>
          Ao criar sua conta voce concorda com os{' '}
          <Link href="/termos" style={styles.consentLink}>
            Termos de Uso
          </Link>{' '}
          e com a{' '}
          <Link href="/privacidade" style={styles.consentLink}>
            Politica de Privacidade
          </Link>
          .
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Ja tem conta?</Text>
        <Link href="/(auth)/login" style={styles.footerLink}>
          Entrar
        </Link>
      </View>
    </Screen>
  );
}

const styles = createThemedStyles(() => ({
  header: {
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.xxs,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
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
  consent: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  consentLink: {
    ...theme.typography.caption,
    color: theme.colors.primaryInk,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xxs,
    paddingTop: theme.spacing.xl,
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
