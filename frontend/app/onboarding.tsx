import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '../src/features/auth/auth-context';
import { ApiError } from '../src/shared/api/types';
import { Button, Screen } from '../src/shared/components';
import { theme, useThemeMode, createThemedStyles } from '../src/shared/theme';

const SELLS_TYPES = [
  { value: 'servicos', label: 'Servicos', icon: 'tool' },
  { value: 'produtos', label: 'Produtos', icon: 'package' },
  { value: 'servicos_e_produtos', label: 'Servicos e produtos', icon: 'layers' },
  { value: 'vendedor', label: 'Sou vendedor', icon: 'trending-up' },
  { value: 'loja', label: 'Tenho uma loja', icon: 'shopping-bag' },
  { value: 'outro', label: 'Outro', icon: 'more-horizontal' },
] as const;

const MAIN_GOALS = [
  { value: 'organizar_clientes', label: 'Organizar meus clientes', icon: 'users' },
  { value: 'criar_orcamentos', label: 'Criar orcamentos', icon: 'file-text' },
  { value: 'acompanhar_vendas', label: 'Acompanhar vendas', icon: 'bar-chart-2' },
  { value: 'nao_esquecer_clientes', label: 'Nao esquecer de responder clientes', icon: 'clock' },
  { value: 'aumentar_vendas', label: 'Aumentar minhas vendas', icon: 'zap' },
  { value: 'organizar_empresa', label: 'Organizar minha empresa', icon: 'grid' },
] as const;

export default function OnboardingScreen() {
  useThemeMode();
  const { completeOnboarding, user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [sellsType, setSellsType] = useState<string | null>(null);
  const [mainGoal, setMainGoal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstName = user?.name.split(' ')[0] ?? '';

  async function handleFinish() {
    if (!sellsType || !mainGoal) return;

    setLoading(true);
    setError(null);

    try {
      await completeOnboarding(sellsType, mainGoal);
      router.replace('/mercado/comecar');
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Nao foi possivel salvar. Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  const isFirstStep = step === 0;
  const options = isFirstStep ? SELLS_TYPES : MAIN_GOALS;
  const selected = isFirstStep ? sellsType : mainGoal;
  const select = isFirstStep ? setSellsType : setMainGoal;

  return (
    <Screen scroll>
      <View style={styles.progress}>
        <View style={[styles.progressBar, styles.progressActive]} />
        <View style={[styles.progressBar, !isFirstStep && styles.progressActive]} />
      </View>

      <View style={styles.header}>
        {isFirstStep ? (
          <>
            <Text style={styles.greeting}>Oi, {firstName}! 👋</Text>
            <Text style={styles.title}>O que voce vende?</Text>
            <Text style={styles.subtitle}>
              Assim o Clyvo ja abre com o que importa para o seu dia.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.greeting}>Quase la</Text>
            <Text style={styles.title}>Qual e o seu objetivo principal?</Text>
            <Text style={styles.subtitle}>Isso define o que aparece em destaque no seu inicio.</Text>
          </>
        )}
      </View>

      <View style={styles.options}>
        {options.map((option) => {
          const active = selected === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => select(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.option,
                active && styles.optionActive,
                pressed && !active && styles.optionPressed,
              ]}
            >
              <View style={[styles.optionIcon, active && styles.optionIconActive]}>
                <Feather
                  name={option.icon}
                  size={20}
                  color={active ? theme.colors.onPrimary : theme.colors.primaryInk}
                />
              </View>

              <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                {option.label}
              </Text>

              {active ? (
                <Feather name="check-circle" size={20} color={theme.colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.formError}>{error}</Text> : null}

      <View style={styles.actions}>
        {isFirstStep ? (
          <Button label="Continuar" disabled={!sellsType} onPress={() => setStep(1)} />
        ) : (
          <>
            <Button
              label="Comecar a usar o Clyvo"
              disabled={!mainGoal}
              loading={loading}
              onPress={handleFinish}
            />
            <Button label="Voltar" variant="ghost" onPress={() => setStep(0)} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = createThemedStyles(() => ({
  progress: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.lg,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceSoftStrong,
  },
  progressActive: {
    backgroundColor: theme.colors.primary,
  },
  header: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.xxs,
  },
  greeting: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primaryInk,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  options: {
    gap: theme.spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionPressed: {
    backgroundColor: theme.colors.surfaceSoft,
  },
  optionActive: {
    backgroundColor: theme.colors.surfaceSoft,
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSoftStrong,
  },
  optionIconActive: {
    backgroundColor: theme.colors.primary,
  },
  optionLabel: {
    ...theme.typography.title,
    color: theme.colors.text,
    flex: 1,
  },
  optionLabelActive: {
    color: theme.colors.text,
  },
  formError: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.md,
  },
  actions: {
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xl,
  },
}));
