import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { theme, useThemeMode, createThemedStyles } from '../theme';

interface ScreenHeaderProps {
  title: string;
  titleLines?: number;
  subtitle?: string;
  action?: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void };
  onBack?: () => void;
}

/** Cabecalho das telas internas, com voltar. */
export function ScreenHeader({ title, subtitle, action, onBack, titleLines = 1 }: ScreenHeaderProps) {
  useThemeMode();
  const router = useRouter();

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Pressable
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')))}
          hitSlop={theme.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={styles.back}
        >
          <Feather name="arrow-left" size={22} color={theme.colors.text} />
        </Pressable>

        <Text style={styles.title} numberOfLines={titleLines}>
          {title}
        </Text>

        {action ? (
          <Pressable
            onPress={action.onPress}
            hitSlop={theme.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={styles.action}
          >
            <Feather name={action.icon} size={20} color={theme.colors.primaryInk} />
          </Pressable>
        ) : (
          <View style={styles.action} />
        )}
      </View>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = createThemedStyles(() => ({
  wrapper: {
    paddingVertical: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
  },
  action: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSoft,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    paddingTop: 2,
  },
}));
