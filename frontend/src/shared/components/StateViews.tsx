import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { theme, useThemeMode, createThemedStyles } from '../theme';
import { Button } from './Button';

/** Estado de carregamento centralizado. */
export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  useThemeMode();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

/** Estado de erro com acao de tentar de novo. */
export function ErrorState({
  title = 'Algo deu errado',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  useThemeMode();
  return (
    <View style={styles.center}>
      <View style={[styles.iconCircle, { backgroundColor: theme.colors.dangerSoft }]}>
        <Feather name="wifi-off" size={26} color={theme.colors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button label="Tentar novamente" variant="outline" fullWidth={false} onPress={onRetry} />
      ) : null}
    </View>
  );
}

/** Estado vazio com uma acao clara. */
export function EmptyState({
  icon = 'inbox',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  useThemeMode();
  return (
    <View style={styles.center}>
      <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceSoft }]}>
        <Feather name={icon} size={26} color={theme.colors.primaryInk} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} fullWidth={false} onPress={onAction} />
      ) : null}
    </View>
  );
}

/** Placeholder das telas que chegam nas proximas etapas. */
export function ComingSoon({
  icon,
  title,
  stage,
  description,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  stage: string;
  description: string;
}) {
  useThemeMode();
  return (
    <View style={styles.center}>
      <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceSoft }]}>
        <Feather name={icon} size={28} color={theme.colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{description}</Text>
      <View style={styles.stage}>
        <Text style={styles.stageText}>{stage}</Text>
      </View>
    </View>
  );
}

const styles = createThemedStyles(() => ({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xxl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xxs,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
    textAlign: 'center',
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  muted: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  stage: {
    backgroundColor: theme.colors.surfaceSoftStrong,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
  },
  stageText: {
    ...theme.typography.badge,
    color: theme.colors.primaryInk,
  },
}));
